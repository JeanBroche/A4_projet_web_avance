import type { Context, Service, ServiceSchema } from "moleculer";
import { prisma } from "../src/db.js";
import { initStockAuditWriter, logStockAudit } from "../src/lib/audit.js";
import { publishStockEvent } from "../src/lib/events.js";
import { registerMaterialLowEmitter } from "../src/lib/alert-notifier.js";
import { ofIdFromStockDocumentRef, DomainEvents } from "@aeronexis/shared";
import {
  assertSiteAccess,
  createError,
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
  movementCreateSchema,
  movementListSchema,
  reservationByIdSchema,
  reservationCreateSchema,
  reservationListSchema,
  supplierDelayListSchema,
  supplierDelayNotifySchema,
  thresholdUpsertSchema,
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
  const auth = await requireLogistique(ctx, params.accessToken);
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
    status: finalStatus
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
        const reservations = await withMaterialLocks(
          materialIds,
          () =>
            prisma.$transaction(async (tx: DbClient) => {
              const created: StockReservation[] = [];
              for (const line of params.lines) {
                const material = await loadActiveMaterial(tx, line.materialId);
                assertSiteAccess(auth, material.siteCode);
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
    }
  }
};

export default StockService;