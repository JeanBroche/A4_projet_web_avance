import type { Context, Service, ServiceSchema } from "moleculer";
import { prisma } from "../src/db.js";
import { initStockAuditWriter, logStockAudit } from "../src/lib/audit.js";
import { publishStockEvent } from "../src/lib/events.js";
import {
  assertSiteAccess,
  createError,
  parseParams,
  requireAuth,
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
  supplierDelayListSchema,
  supplierDelayNotifySchema,
  thresholdUpsertSchema
} from "../src/lib/schemas.js";
import type { StockReservation } from "../src/generated/prisma/client.js";
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
  const auth = requireLogistique(ctx, params.accessToken);
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
  publishStockEvent(this, "stock.released", {
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
        const auth = requireAuth(ctx, params.accessToken);
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
        const auth = requireAuth(ctx, params.accessToken);
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
        const auth = requireLogistique(ctx, params.accessToken);
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
        publishStockEvent(this, "stock.movement.recorded", {
          movementId: result.id,
          materialId: material.id,
          type: params.type,
          quantity: params.quantity
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
        const auth = requireAuth(ctx, params.accessToken);
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
        const auth = requireLogistique(ctx, params.accessToken);
        const reservations = await prisma.$transaction(async (tx: DbClient) => {
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
        });
        publishStockEvent(this, "stock.reserved", {
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
    "alert.list": {
      async handler(ctx) {
        const params = parseParams(alertListSchema, ctx.params);
        const auth = requireStockRead(ctx, params.accessToken);
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
        const auth = requireLogistique(ctx, params.accessToken);
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
        const auth = requireStockRead(ctx, params.accessToken);
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
        requireAuth(ctx, params.accessToken);
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
    "supplier.delay.notify": {
      async handler(ctx) {
        const params = parseParams(supplierDelayNotifySchema, ctx.params);
        const auth = requireLogistique(ctx, params.accessToken);
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
        publishStockEvent(this, "supplier.delay.reported", {
          delayId: delay.id,
          materialId: params.materialId,
          supplier: params.supplier
        });
        return delay;
      }
    }
  }
};

export default StockService;