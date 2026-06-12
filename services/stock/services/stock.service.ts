import type { Context, Service, ServiceSchema } from "moleculer";
import { prisma } from "../src/db.js";
import { initStockAuditWriter, logStockAudit } from "../src/lib/audit.js";
import { publishStockEvent } from "../src/lib/events.js";
import { registerMaterialLowEmitter } from "../src/lib/alert-notifier.js";
import { ofIdFromStockDocumentRef, DomainEvents } from "@aeronexis/shared";
import { stockIntegrationEvents } from "./events/production-events.js";
import {
  assertSiteAccess,
  createError,
  generateCode,
  parseParams,
  requireAuth,
  requireAnyRole,
  requireLogistique,
  requireStockRead,
  resolveEffectiveSite
} from "@aeronexis/services-shared";
import {
  alertListSchema,
  forecastRuptureSchema,
  levelConsolidateSchema,
  levelListSchema,
  lotCreateSchema,
  lotListSchema,
  lotUpdateSchema,
  movementCreateSchema,
  movementListSchema,
  reservationByIdSchema,
  reservationCreateSchema,
  reservationListSchema,
  reservationUpdateSchema,
  purchaseOrderCreateSchema,
  purchaseOrderListSchema,
  purchaseOrderReceiveSchema,
  purchaseOrderUpdateSchema,
  supplierDelayListSchema,
  supplierDelayNotifySchema,
  thresholdUpsertSchema,
  transferCreateSchema,
  materialListSchema,
  materialGetSchema,
  materialUpsertSchema
} from "../src/lib/schemas.js";
import type { StockReservation } from "../src/generated/prisma/client.js";
import { withMaterialLocks } from "../src/lib/locks.js";
import {
  computeAvailable,
  consolidateByCode,
  evaluateThreshold,
  loadActiveMaterial,
  toStockLevel,
  type DbClient
} from "../src/lib/stock-helpers.js";

async function releaseOrCancel(
  this: Service,
  ctx: Context,
  finalStatus: "RELEASED" | "CANCELLED"
) {
  const params = parseParams(reservationByIdSchema, ctx.params);
  const auth = await requireAnyRole(ctx, params.accessToken, [
    "logistique",
    "operateur",
    "commercial"
  ]);
  const reservation = await prisma.stockReservation.findUnique({
    where: { id: params.id }
  });
  if (!reservation) {
    throw createError("NOT_FOUND", `Reservation not found: ${params.id}`);
  }
  if (reservation.status !== "ACTIVE") {
    throw createError("RESERVATION_INACTIVE");
  }
  assertSiteAccess(auth, reservation.siteCode);
  const updated = await prisma.$transaction(async (tx: DbClient) => {
    const next = await tx.stockReservation.update({
      where: { id: reservation.id },
      data: { status: finalStatus, releasedAt: new Date() }
    });
    const material = await tx.material.findUnique({
      where: { id: reservation.materialId }
    });
    if (material) {
      await tx.material.update({
        where: { id: material.id },
        data: { reservedStock: Math.max(0, material.reservedStock - reservation.quantity) }
      });
      await evaluateThreshold(tx, material.id);
    }
    return next;
  });
  publishStockEvent(this, DomainEvents.stock.released, {
    reservationId: updated.id,
    ofId: reservation.ofId,
    siteCode: reservation.siteCode,
    status: finalStatus,
    count: 1,
    reason: finalStatus
  });
  await logStockAudit({
    action: finalStatus === "RELEASED" ? "stock.reservation.release" : "stock.reservation.cancel",
    actorId: auth.sub,
    actorEmail: auth.email,
    roles: auth.roles,
    entity: "StockReservation",
    entityId: updated.id,
    siteCode: reservation.siteCode,
    correlationId: (ctx.meta as { correlationId?: string }).correlationId,
    diff: {
      before: { status: reservation.status },
      after: { status: finalStatus }
    }
  });
  this.logger.info("Reservation transitioned", {
    correlationId: (ctx.meta as { correlationId?: string }).correlationId,
    reservationId: updated.id,
    status: finalStatus
  });
  return updated;
}

const StockService: ServiceSchema = {
  name: "stock",

  started(this: Service) {
    initStockAuditWriter(this);
    registerMaterialLowEmitter((payload) => {
      publishStockEvent(this, DomainEvents.stock.materialLow, payload);
    });
  },

  events: stockIntegrationEvents,

  actions: {
    ping: {
      handler(ctx) {
        this.logger.info("Ping", { correlationId: (ctx.meta as { correlationId?: string }).correlationId });
        return "pong";
      }
    },
    "level.list": {
      async handler(ctx) {
        const params = parseParams(levelListSchema, ctx.params);
        const auth = await requireAuth(ctx, params.accessToken);
        const effectiveSite = resolveEffectiveSite(auth, params);
        const where = {
          deletedAt: null,
          ...(effectiveSite ? { siteCode: effectiveSite } : {}),
          ...(params.code ? { code: params.code } : {})
        };
        const materials = await prisma.material.findMany({
          where,
          orderBy: [{ siteCode: "asc" }, { code: "asc" }]
        });
        return materials.map(toStockLevel);
      }
    },
    "level.consolidate": {
      async handler(ctx) {
        const params = parseParams(levelConsolidateSchema, ctx.params);
        const auth = await requireAuth(ctx, params.accessToken);
        const effectiveSite = resolveEffectiveSite(auth, params);
        const materials = await prisma.material.findMany({
          where: {
            deletedAt: null,
            ...(effectiveSite ? { siteCode: effectiveSite } : {}),
            ...(params.code ? { code: params.code } : {})
          },
          orderBy: [{ code: "asc" }, { siteCode: "asc" }]
        });
        const levels = materials.map(toStockLevel);
        return consolidateByCode(levels);
      }
    },
    "movement.create": {
      async handler(ctx) {
        const params = parseParams(movementCreateSchema, ctx.params);
        const auth = await requireLogistique(ctx, params.accessToken);
        const material = await loadActiveMaterial(prisma, params.materialId);
        assertSiteAccess(auth, material.siteCode);
        if (material.siteCode !== params.siteCode) {
          throw createError(
            "VALIDATION_ERROR",
            `Material ${material.code} does not belong to site ${params.siteCode}`
          );
        }
        const delta =
          params.type === "IN"
            ? params.quantity
            : params.type === "OUT"
              ? -params.quantity
              : params.quantity;
        const newCurrent =
          params.type === "ADJUST" ? params.quantity : material.currentStock + delta;
        if (newCurrent < 0) {
          throw createError("INSUFFICIENT_STOCK");
        }
        const result = await prisma.$transaction(async (tx: DbClient) => {
          const movement = await tx.stockMovement.create({
            data: {
              materialId: material.id,
              siteCode: material.siteCode,
              type: params.type,
              quantity: params.quantity,
              reason: params.reason,
              documentRef: params.documentRef
            }
          });
          await tx.material.update({
            where: { id: material.id },
            data: {
              currentStock: newCurrent,
              ...(params.type === "IN" ? { lastReplenishment: new Date() } : {})
            }
          });
          await evaluateThreshold(tx, material.id);
          return movement;
        });
        publishStockEvent(this, DomainEvents.stock.movementRecorded, {
          movementId: result.id,
          materialId: material.id,
          type: params.type,
          quantity: params.quantity,
          ofId: ofIdFromStockDocumentRef(params.documentRef)
        });
        await logStockAudit({
          action: "stock.movement.create",
          actorId: auth.sub,
          actorEmail: auth.email,
          roles: auth.roles,
          entity: "StockMovement",
          entityId: result.id,
          siteCode: material.siteCode,
          correlationId: (ctx.meta as { correlationId?: string }).correlationId,
          metadata: {
            materialId: material.id,
            materialCode: material.code,
            type: params.type,
            quantity: params.quantity,
            documentRef: params.documentRef
          },
          diff: {
            after: {
              type: params.type,
              quantity: params.quantity,
              currentStock: newCurrent
            }
          }
        });
        this.logger.info("Stock movement recorded", {
          correlationId: (ctx.meta as { correlationId?: string }).correlationId,
          movementId: result.id,
          materialId: material.id,
          type: params.type
        });
        return result;
      }
    },
    "movement.list": {
      async handler(ctx) {
        const params = parseParams(movementListSchema, ctx.params);
        const auth = await requireAuth(ctx, params.accessToken);
        const effectiveSite = resolveEffectiveSite(auth, params);
        const where = {
          ...(effectiveSite ? { siteCode: effectiveSite } : {}),
          ...(params.materialId ? { materialId: params.materialId } : {}),
          ...(params.type ? { type: params.type } : {})
        };
        return prisma.stockMovement.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: params.limit ?? 100,
          skip: params.offset ?? 0
        });
      }
    },
    "reservation.create": {
      async handler(ctx) {
        const params = parseParams(reservationCreateSchema, ctx.params);
        const auth = await requireAnyRole(ctx, params.accessToken, [
          "logistique",
          "operateur",
          "commercial"
        ]);
        const materialIds = params.lines.map((line) => line.materialId);
        const duplicateLineIds = materialIds.filter(
          (id, index) => materialIds.indexOf(id) !== index
        );
        if (duplicateLineIds.length > 0) {
          throw createError(
            "VALIDATION_ERROR",
            "Duplicate material lines in reservation request"
          );
        }
        const reservations = await withMaterialLocks(
          materialIds,
          () =>
            prisma.$transaction(async (tx: DbClient) => {
              const created: StockReservation[] = [];
              for (const line of params.lines) {
                const material = await loadActiveMaterial(tx, line.materialId);
                assertSiteAccess(auth, material.siteCode);
                const existing = await tx.stockReservation.findFirst({
                  where: {
                    ofId: params.ofId,
                    materialId: material.id,
                    status: "ACTIVE"
                  }
                });
                if (existing) {
                  throw createError(
                    "RESERVATION_ALREADY_ACTIVE",
                    `Material ${material.code} is already reserved for ${params.ofId}`
                  );
                }
                const available = computeAvailable(material);
                if (line.qty > available) {
                  throw createError(
                    "INSUFFICIENT_STOCK",
                    `Material ${material.code}: requested ${line.qty}, available ${available}`
                  );
                }
                const reservation = await tx.stockReservation.create({
                  data: {
                    ofId: params.ofId,
                    materialId: material.id,
                    siteCode: material.siteCode,
                    quantity: line.qty,
                    status: "ACTIVE"
                  }
                });
                await tx.material.update({
                  where: { id: material.id },
                  data: { reservedStock: material.reservedStock + line.qty }
                });
                await evaluateThreshold(tx, material.id);
                created.push(reservation);
              }
              return created;
            }),
          this.logger
        );
        publishStockEvent(this, DomainEvents.stock.reserved, {
          ofId: params.ofId,
          reservationIds: reservations.map((r: StockReservation) => r.id)
        });
        await logStockAudit({
          action: "stock.reservation.create",
          actorId: auth.sub,
          actorEmail: auth.email,
          roles: auth.roles,
          entity: "StockReservation",
          siteCode: reservations[0]?.siteCode,
          correlationId: (ctx.meta as { correlationId?: string }).correlationId,
          metadata: {
            ofId: params.ofId,
            reservationIds: reservations.map((r) => r.id),
            lineCount: reservations.length
          }
        });
        this.logger.info("Reservations created", {
          correlationId: (ctx.meta as { correlationId?: string }).correlationId,
          ofId: params.ofId,
          count: reservations.length
        });
        return { ofId: params.ofId, reservations };
      }
    },
    "reservation.release": {
      async handler(ctx) {
        return releaseOrCancel.call(this, ctx, "RELEASED");
      }
    },
    "reservation.cancel": {
      async handler(ctx) {
        return releaseOrCancel.call(this, ctx, "CANCELLED");
      }
    },
    "reservation.update": {
      async handler(ctx) {
        const params = parseParams(reservationUpdateSchema, ctx.params);
        const auth = await requireAnyRole(ctx, params.accessToken, [
          "logistique",
          "operateur",
          "commercial"
        ]);

        const reservation = await prisma.stockReservation.findUnique({
          where: { id: params.id },
          include: {
            material: { select: { code: true, description: true, unit: true, siteCode: true } }
          }
        });
        if (!reservation) {
          throw createError("NOT_FOUND", `Reservation not found: ${params.id}`);
        }
        if (reservation.status !== "ACTIVE") {
          throw createError("RESERVATION_INACTIVE");
        }
        assertSiteAccess(auth, reservation.siteCode);

        if (params.qty === reservation.quantity) {
          return reservation;
        }

        const updated = await withMaterialLocks(
          [reservation.materialId],
          () =>
            prisma.$transaction(async (tx: DbClient) => {
              const current = await tx.stockReservation.findUnique({
                where: { id: params.id }
              });
              if (!current || current.status !== "ACTIVE") {
                throw createError("RESERVATION_INACTIVE");
              }
              const material = await loadActiveMaterial(tx, current.materialId);
              const delta = params.qty - current.quantity;
              if (delta > 0) {
                const available = computeAvailable(material);
                if (delta > available) {
                  throw createError(
                    "INSUFFICIENT_STOCK",
                    `Material ${material.code}: requested ${params.qty}, available ${available + current.quantity}`
                  );
                }
              }
              const nextReservation = await tx.stockReservation.update({
                where: { id: current.id },
                data: { quantity: params.qty },
                include: {
                  material: { select: { code: true, description: true, unit: true, siteCode: true } }
                }
              });
              await tx.material.update({
                where: { id: material.id },
                data: { reservedStock: Math.max(0, material.reservedStock + delta) }
              });
              await evaluateThreshold(tx, material.id);
              return nextReservation;
            }),
          this.logger
        );

        await logStockAudit({
          action: "stock.reservation.update",
          actorId: auth.sub,
          actorEmail: auth.email,
          roles: auth.roles,
          entity: "StockReservation",
          entityId: updated.id,
          siteCode: reservation.siteCode,
          correlationId: (ctx.meta as { correlationId?: string }).correlationId,
          diff: {
            before: { quantity: reservation.quantity },
            after: { quantity: params.qty }
          }
        });
        this.logger.info("Reservation updated", {
          correlationId: (ctx.meta as { correlationId?: string }).correlationId,
          reservationId: updated.id,
          quantity: params.qty
        });
        return updated;
      }
    },
    "reservation.list": {
      async handler(ctx) {
        const params = parseParams(reservationListSchema, ctx.params);
        const auth = await requireStockRead(ctx, params.accessToken);
        const effectiveSite = resolveEffectiveSite(auth, params);
        const reservations = await prisma.stockReservation.findMany({
          where: {
            ...(effectiveSite ? { siteCode: effectiveSite } : {}),
            ...(params.ofId ? { ofId: params.ofId } : {}),
            ...(params.status ? { status: params.status } : {})
          },
          orderBy: { createdAt: "desc" },
          take: params.limit ?? 100,
          skip: params.offset ?? 0,
          include: {
            material: {
              select: { code: true, description: true, unit: true, siteCode: true }
            }
          }
        });
        return { reservations };
      }
    },
    "alert.list": {
      async handler(ctx) {
        const params = parseParams(alertListSchema, ctx.params);
        const auth = await requireStockRead(ctx, params.accessToken);
        const effectiveSite = resolveEffectiveSite(auth, params);
        const materials = await prisma.material.findMany({
          where: {
            deletedAt: null,
            ...(effectiveSite ? { siteCode: effectiveSite } : {})
          }
        });
        await prisma.$transaction(async (tx: DbClient) => {
          for (const material of materials) {
            await evaluateThreshold(tx, material.id);
          }
        });
        return prisma.stockAlert.findMany({
          where: {
            ...(effectiveSite ? { siteCode: effectiveSite } : {}),
            ...(params.includeResolved ? {} : { resolvedAt: null })
          },
          orderBy: { createdAt: "desc" },
          include: {
            material: {
              select: { code: true, description: true, unit: true, siteCode: true }
            }
          }
        });
      }
    },
    "threshold.upsert": {
      async handler(ctx) {
        const params = parseParams(thresholdUpsertSchema, ctx.params);
        const auth = await requireLogistique(ctx, params.accessToken);
        const material = await loadActiveMaterial(prisma, params.materialId);
        assertSiteAccess(auth, material.siteCode);
        const updated = await prisma.material.update({
          where: { id: material.id },
          data: { minimumStock: params.minimumStock }
        });
        const alert = await evaluateThreshold(prisma, material.id);
        return { material: toStockLevel(updated), alert };
      }
    },
    "forecast.rupture": {
      async handler(ctx) {
        const params = parseParams(forecastRuptureSchema, ctx.params);
        const auth = await requireStockRead(ctx, params.accessToken);
        const effectiveSite = resolveEffectiveSite(auth, params);
        const windowDays = params.windowDays ?? 30;
        const windowStart = new Date();
        windowStart.setDate(windowStart.getDate() - windowDays);
        const materials = await prisma.material.findMany({
          where: {
            deletedAt: null,
            ...(effectiveSite ? { siteCode: effectiveSite } : {})
          }
        });
        const results = [];
        for (const material of materials) {
          const aggregate = await prisma.stockMovement.aggregate({
            where: {
              materialId: material.id,
              type: "OUT",
              createdAt: { gte: windowStart }
            },
            _sum: { quantity: true }
          });
          const totalOut = aggregate._sum.quantity ?? 0;
          const dailyRate = totalOut / windowDays;
          const available = computeAvailable(material);
          let score: number;
          let estimatedDaysToRupture: number | null = null;
          if (available <= 0) {
            score = 100;
          } else if (dailyRate <= 0) {
            score = 0;
          } else {
            estimatedDaysToRupture = available / dailyRate;
            const ratio = (dailyRate * windowDays) / available;
            score = Math.min(100, Math.round(ratio * 100));
          }
          results.push({
            materialId: material.id,
            code: material.code,
            siteCode: material.siteCode,
            available,
            minimum: material.minimumStock,
            consumptionPerDay: Math.round(dailyRate * 100) / 100,
            estimatedDaysToRupture:
              estimatedDaysToRupture === null ? null : Math.round(estimatedDaysToRupture * 10) / 10,
            score
          });
        }
        return results.sort((a, b) => b.score - a.score);
      }
    },
    "supplier.delay.list": {
      async handler(ctx) {
        const params = parseParams(supplierDelayListSchema, ctx.params);
        await requireAuth(ctx, params.accessToken);
        return prisma.supplierDelay.findMany({
          where: {
            ...(params.materialId ? { materialId: params.materialId } : {}),
            ...(params.supplier ? { supplier: params.supplier } : {})
          },
          orderBy: { expectedDate: "desc" },
          include: {
            material: { select: { code: true, description: true, siteCode: true } }
          }
        });
      }
    },
    "material.list": {
      async handler(ctx) {
        const params = parseParams(materialListSchema, ctx.params);
        const auth = await requireStockRead(ctx, params.accessToken);
        const effectiveSite = resolveEffectiveSite(auth, params);
        const materials = await prisma.material.findMany({
          where: {
            deletedAt: null,
            ...(effectiveSite ? { siteCode: effectiveSite } : {}),
            ...(params.code ? { code: params.code } : {})
          },
          orderBy: [{ siteCode: "asc" }, { code: "asc" }],
          take: params.limit ?? 100,
          skip: params.offset ?? 0
        });
        return materials.map(toStockLevel);
      }
    },
    "material.get": {
      async handler(ctx) {
        const params = parseParams(materialGetSchema, ctx.params);
        const auth = await requireStockRead(ctx, params.accessToken);
        const material = params.materialId
          ? await loadActiveMaterial(prisma, params.materialId)
          : await prisma.material.findFirst({
              where: {
                code: params.code!,
                siteCode: params.siteCode!,
                deletedAt: null
              }
            });
        if (!material) {
          throw createError("NOT_FOUND", "Material not found");
        }
        assertSiteAccess(auth, material.siteCode);
        return toStockLevel(material);
      }
    },
    "material.upsert": {
      async handler(ctx) {
        const params = parseParams(materialUpsertSchema, ctx.params);
        const auth = await requireLogistique(ctx, params.accessToken);
        assertSiteAccess(auth, params.siteCode);

        const existing = await prisma.material.findFirst({
          where: {
            code: params.code,
            siteCode: params.siteCode,
            deletedAt: null
          }
        });

        const material = existing
          ? await prisma.material.update({
              where: { id: existing.id },
              data: {
                description: params.description,
                unit: params.unit,
                currentStock: params.currentStock ?? existing.currentStock,
                minimumStock: params.minimumStock ?? existing.minimumStock,
                supplier: params.supplier ?? existing.supplier
              }
            })
          : await prisma.material.create({
              data: {
                code: params.code,
                siteCode: params.siteCode,
                description: params.description,
                unit: params.unit,
                currentStock: params.currentStock ?? 0,
                minimumStock: params.minimumStock ?? 0,
                supplier: params.supplier
              }
            });

        await evaluateThreshold(prisma, material.id);
        return toStockLevel(material);
      }
    },
    "supplier.delay.notify": {
      async handler(ctx) {
        const params = parseParams(supplierDelayNotifySchema, ctx.params);
        const auth = await requireLogistique(ctx, params.accessToken);
        const material = await loadActiveMaterial(prisma, params.materialId);
        assertSiteAccess(auth, material.siteCode);
        const delay = await prisma.supplierDelay.create({
          data: {
            materialId: params.materialId,
            supplier: params.supplier,
            expectedDate: params.expectedDate,
            actualDate: params.actualDate,
            notes: params.notes
          }
        });
        publishStockEvent(this, DomainEvents.stock.supplierDelayReported, {
          delayId: delay.id,
          materialId: params.materialId,
          materialCode: material.code,
          siteCode: material.siteCode,
          supplier: params.supplier,
          notes: params.notes
        });
        return delay;
      }
    },
    "lot.list": {
      async handler(ctx) {
        const params = parseParams(lotListSchema, ctx.params);
        const auth = await requireStockRead(ctx, params.accessToken);
        const effectiveSite = resolveEffectiveSite(auth, params);
        const lots = await prisma.materialLot.findMany({
          where: {
            ...(effectiveSite ? { siteCode: effectiveSite } : {}),
            ...(params.materialId ? { materialId: params.materialId } : {}),
            ...(params.status ? { status: params.status } : {})
          },
          orderBy: [{ expiryAt: "asc" }, { receivedAt: "desc" }],
          take: params.limit ?? 100,
          skip: params.offset ?? 0,
          include: {
            material: {
              select: { code: true, description: true, unit: true, siteCode: true }
            }
          }
        });
        return lots;
      }
    },
    "lot.create": {
      async handler(ctx) {
        const params = parseParams(lotCreateSchema, ctx.params);
        const auth = await requireLogistique(ctx, params.accessToken);
        const material = await loadActiveMaterial(prisma, params.materialId);
        assertSiteAccess(auth, material.siteCode);
        if (material.siteCode !== params.siteCode) {
          throw createError(
            "VALIDATION_ERROR",
            `Material ${material.code} does not belong to site ${params.siteCode}`
          );
        }
        const lot = await prisma.$transaction(async (tx: DbClient) => {
          const created = await tx.materialLot.create({
            data: {
              materialId: params.materialId,
              siteCode: params.siteCode,
              lotNumber: params.lotNumber,
              supplierLot: params.supplierLot,
              supplier: params.supplier ?? material.supplier,
              certificateRef: params.certificateRef,
              certificateUrl: params.certificateUrl,
              manufacturedAt: params.manufacturedAt,
              expiryAt: params.expiryAt,
              receivedAt: params.receivedAt ?? new Date(),
              quantity: params.quantity,
              remainingQty: params.quantity,
              location: params.location,
              notes: params.notes
            }
          });
          await tx.stockMovement.create({
            data: {
              materialId: material.id,
              siteCode: material.siteCode,
              type: "IN",
              quantity: params.quantity,
              reason: `Réception lot ${params.lotNumber}`,
              documentRef: `LOT::${created.id}`
            }
          });
          await tx.material.update({
            where: { id: material.id },
            data: {
              currentStock: material.currentStock + params.quantity,
              lastReplenishment: new Date()
            }
          });
          await evaluateThreshold(tx, material.id);
          return created;
        });
        await logStockAudit({
          action: "stock.lot.create",
          actorId: auth.sub,
          actorEmail: auth.email,
          roles: auth.roles,
          entity: "MaterialLot",
          entityId: lot.id,
          siteCode: lot.siteCode,
          correlationId: (ctx.meta as { correlationId?: string }).correlationId,
          metadata: {
            materialCode: material.code,
            lotNumber: lot.lotNumber,
            quantity: lot.quantity
          }
        });
        this.logger.info("Material lot created", {
          correlationId: (ctx.meta as { correlationId?: string }).correlationId,
          lotId: lot.id,
          materialId: lot.materialId
        });
        return lot;
      }
    },
    "po.list": {
      async handler(ctx) {
        const params = parseParams(purchaseOrderListSchema, ctx.params);
        const auth = await requireStockRead(ctx, params.accessToken);
        const effectiveSite = resolveEffectiveSite(auth, params);
        const orders = await prisma.purchaseOrder.findMany({
          where: {
            ...(effectiveSite ? { siteCode: effectiveSite } : {}),
            ...(params.materialId ? { materialId: params.materialId } : {}),
            ...(params.status ? { status: params.status } : {}),
            ...(params.supplier ? { supplier: params.supplier } : {})
          },
          orderBy: { createdAt: "desc" },
          take: params.limit ?? 100,
          skip: params.offset ?? 0,
          include: {
            material: { select: { code: true, description: true, unit: true } }
          }
        });
        return orders;
      }
    },
    "po.create": {
      async handler(ctx) {
        const params = parseParams(purchaseOrderCreateSchema, ctx.params);
        const auth = await requireLogistique(ctx, params.accessToken);
        const material = await loadActiveMaterial(prisma, params.materialId);
        assertSiteAccess(auth, material.siteCode);
        if (material.siteCode !== params.siteCode) {
          throw createError(
            "VALIDATION_ERROR",
            `Material ${material.code} does not belong to site ${params.siteCode}`
          );
        }
        const poNumber = `PO-${generateCode("PO")}`;
        const order = await prisma.purchaseOrder.create({
          data: {
            poNumber,
            materialId: params.materialId,
            siteCode: params.siteCode,
            supplier: params.supplier,
            quantity: params.quantity,
            unitPrice: params.unitPrice,
            expectedDate: params.expectedDate,
            notes: params.notes,
            status: "ORDERED"
          }
        });
        await logStockAudit({
          action: "stock.po.create",
          actorId: auth.sub,
          actorEmail: auth.email,
          roles: auth.roles,
          entity: "PurchaseOrder",
          entityId: order.id,
          siteCode: order.siteCode,
          correlationId: (ctx.meta as { correlationId?: string }).correlationId,
          metadata: {
            poNumber: order.poNumber,
            materialCode: material.code,
            supplier: order.supplier,
            quantity: order.quantity
          }
        });
        this.logger.info("Purchase order created", {
          correlationId: (ctx.meta as { correlationId?: string }).correlationId,
          poNumber: order.poNumber,
          materialId: material.id
        });
        return order;
      }
    },
    "po.update": {
      async handler(ctx) {
        const params = parseParams(purchaseOrderUpdateSchema, ctx.params);
        const auth = await requireLogistique(ctx, params.accessToken);
        const existing = await prisma.purchaseOrder.findUnique({
          where: { id: params.id }
        });
        if (!existing) {
          throw createError("NOT_FOUND", `Purchase order not found: ${params.id}`);
        }
        assertSiteAccess(auth, existing.siteCode);
        const updated = await prisma.purchaseOrder.update({
          where: { id: params.id },
          data: {
            ...(params.status ? { status: params.status } : {}),
            ...(params.expectedDate !== undefined ? { expectedDate: params.expectedDate } : {}),
            ...(params.notes !== undefined ? { notes: params.notes } : {})
          }
        });
        return updated;
      }
    },
    "po.receive": {
      async handler(ctx) {
        const params = parseParams(purchaseOrderReceiveSchema, ctx.params);
        const auth = await requireLogistique(ctx, params.accessToken);
        const order = await prisma.purchaseOrder.findUnique({
          where: { id: params.id }
        });
        if (!order) {
          throw createError("NOT_FOUND", `Purchase order not found: ${params.id}`);
        }
        if (order.status === "RECEIVED" || order.status === "CANCELLED") {
          throw createError("VALIDATION_ERROR", `Cannot receive on a ${order.status} order`);
        }
        assertSiteAccess(auth, order.siteCode);
        const remaining = order.quantity - order.receivedQty;
        if (params.receivedQty > remaining) {
          throw createError(
            "VALIDATION_ERROR",
            `Cannot receive ${params.receivedQty}: ${remaining} remaining on PO ${order.poNumber}`
          );
        }
        const newReceivedQty = order.receivedQty + params.receivedQty;
        const newStatus =
          newReceivedQty >= order.quantity ? "RECEIVED" : "PARTIAL";
        const material = await loadActiveMaterial(prisma, order.materialId);
        const result = await prisma.$transaction(async (tx: DbClient) => {
          const updatedOrder = await tx.purchaseOrder.update({
            where: { id: order.id },
            data: {
              receivedQty: newReceivedQty,
              status: newStatus,
              receivedDate:
                newStatus === "RECEIVED" ? new Date() : order.receivedDate
            }
          });
          await tx.stockMovement.create({
            data: {
              materialId: material.id,
              siteCode: material.siteCode,
              type: "IN",
              quantity: params.receivedQty,
              reason: `Réception PO ${order.poNumber}`,
              documentRef: `PO::${order.poNumber}`
            }
          });
          await tx.material.update({
            where: { id: material.id },
            data: {
              currentStock: material.currentStock + params.receivedQty,
              lastReplenishment: new Date()
            }
          });
          await evaluateThreshold(tx, material.id);
          return updatedOrder;
        });
        await logStockAudit({
          action: "stock.po.receive",
          actorId: auth.sub,
          actorEmail: auth.email,
          roles: auth.roles,
          entity: "PurchaseOrder",
          entityId: result.id,
          siteCode: result.siteCode,
          correlationId: (ctx.meta as { correlationId?: string }).correlationId,
          metadata: {
            poNumber: result.poNumber,
            receivedQty: params.receivedQty,
            status: result.status
          }
        });
        this.logger.info("Purchase order received", {
          correlationId: (ctx.meta as { correlationId?: string }).correlationId,
          poNumber: result.poNumber,
          receivedQty: params.receivedQty,
          status: result.status
        });
        return result;
      }
    },
    "transfer.create": {
      async handler(ctx) {
        const params = parseParams(transferCreateSchema, ctx.params);
        const auth = await requireLogistique(ctx, params.accessToken);
        const sourceMaterial = await loadActiveMaterial(prisma, params.materialId);
        assertSiteAccess(auth, sourceMaterial.siteCode);
        if (sourceMaterial.siteCode !== params.sourceSiteCode) {
          throw createError(
            "VALIDATION_ERROR",
            `Material ${sourceMaterial.code} does not belong to source site ${params.sourceSiteCode}`
          );
        }
        if (computeAvailable(sourceMaterial) < params.quantity) {
          throw createError(
            "INSUFFICIENT_STOCK",
            `Material ${sourceMaterial.code}: requested ${params.quantity}, available ${computeAvailable(sourceMaterial)}`
          );
        }
        const result = await prisma.$transaction(async (tx: DbClient) => {
          let destMaterial = await tx.material.findFirst({
            where: {
              code: sourceMaterial.code,
              siteCode: params.destSiteCode,
              deletedAt: null
            }
          });
          if (!destMaterial) {
            destMaterial = await tx.material.create({
              data: {
                code: sourceMaterial.code,
                siteCode: params.destSiteCode,
                description: sourceMaterial.description,
                unit: sourceMaterial.unit,
                currentStock: 0,
                minimumStock: 0,
                supplier: sourceMaterial.supplier
              }
            });
          }
          const transferRef = `TRANSFER::${sourceMaterial.code}::${params.sourceSiteCode}->${params.destSiteCode}::${Date.now()}`;
          const reason = params.reason ?? `Transfert ${params.sourceSiteCode} → ${params.destSiteCode}`;

          const outMovement = await tx.stockMovement.create({
            data: {
              materialId: sourceMaterial.id,
              siteCode: sourceMaterial.siteCode,
              type: "OUT",
              quantity: params.quantity,
              reason,
              documentRef: transferRef
            }
          });
          await tx.material.update({
            where: { id: sourceMaterial.id },
            data: { currentStock: sourceMaterial.currentStock - params.quantity }
          });
          await evaluateThreshold(tx, sourceMaterial.id);

          const inMovement = await tx.stockMovement.create({
            data: {
              materialId: destMaterial.id,
              siteCode: destMaterial.siteCode,
              type: "IN",
              quantity: params.quantity,
              reason,
              documentRef: transferRef
            }
          });
          await tx.material.update({
            where: { id: destMaterial.id },
            data: {
              currentStock: destMaterial.currentStock + params.quantity,
              lastReplenishment: new Date()
            }
          });
          await evaluateThreshold(tx, destMaterial.id);

          return {
            transferRef,
            outMovementId: outMovement.id,
            inMovementId: inMovement.id,
            sourceMaterialId: sourceMaterial.id,
            destMaterialId: destMaterial.id
          };
        });
        await logStockAudit({
          action: "stock.transfer.create",
          actorId: auth.sub,
          actorEmail: auth.email,
          roles: auth.roles,
          entity: "StockMovement",
          entityId: result.outMovementId,
          siteCode: sourceMaterial.siteCode,
          correlationId: (ctx.meta as { correlationId?: string }).correlationId,
          metadata: {
            materialCode: sourceMaterial.code,
            sourceSiteCode: params.sourceSiteCode,
            destSiteCode: params.destSiteCode,
            quantity: params.quantity,
            transferRef: result.transferRef
          }
        });
        this.logger.info("Inter-site transfer recorded", {
          correlationId: (ctx.meta as { correlationId?: string }).correlationId,
          materialCode: sourceMaterial.code,
          quantity: params.quantity,
          sourceSiteCode: params.sourceSiteCode,
          destSiteCode: params.destSiteCode
        });
        return result;
      }
    },
    "lot.update": {
      async handler(ctx) {
        const params = parseParams(lotUpdateSchema, ctx.params);
        const auth = await requireLogistique(ctx, params.accessToken);
        const existing = await prisma.materialLot.findUnique({
          where: { id: params.id }
        });
        if (!existing) {
          throw createError("NOT_FOUND", `Lot not found: ${params.id}`);
        }
        assertSiteAccess(auth, existing.siteCode);
        const updated = await prisma.materialLot.update({
          where: { id: params.id },
          data: {
            ...(params.status ? { status: params.status } : {}),
            ...(params.location !== undefined ? { location: params.location } : {}),
            ...(params.remainingQty !== undefined ? { remainingQty: params.remainingQty } : {}),
            ...(params.notes !== undefined ? { notes: params.notes } : {})
          }
        });
        await logStockAudit({
          action: "stock.lot.update",
          actorId: auth.sub,
          actorEmail: auth.email,
          roles: auth.roles,
          entity: "MaterialLot",
          entityId: updated.id,
          siteCode: updated.siteCode,
          correlationId: (ctx.meta as { correlationId?: string }).correlationId,
          diff: {
            before: {
              status: existing.status,
              location: existing.location,
              remainingQty: existing.remainingQty
            },
            after: {
              status: updated.status,
              location: updated.location,
              remainingQty: updated.remainingQty
            }
          }
        });
        return updated;
      }
    }
  }
};

export default StockService;