"use strict";

/** @type {import("../src/generated/prisma/client.js").PrismaClient | null} */
let prisma = null;

/** @type {Record<string, Function> | null} */
let lib = null;

async function loadLib() {
  if (lib) {
    return lib;
  }

  const [errorsMod, schemasMod, rbacMod, helpersMod, eventsMod, dbMod] = await Promise.all([
    import("../src/lib/errors.mjs"),
    import("../src/lib/schemas.mjs"),
    import("../src/lib/rbac.mjs"),
    import("../src/lib/stock-helpers.mjs"),
    import("../src/lib/events.mjs"),
    import("../src/db.mjs")
  ]);

  prisma = dbMod.prisma;
  lib = {
    ...errorsMod,
    ...schemasMod,
    ...rbacMod,
    ...helpersMod,
    ...eventsMod
  };

  return lib;
}

async function getCtx() {
  const loaded = await loadLib();
  return { prisma, lib: loaded };
}

function parseParams(schema, raw, l) {
  try {
    return schema.parse(raw);
  } catch (error) {
    l.parseOrThrow(error);
  }
  return undefined;
}

function buildSiteFilter(params) {
  const siteCode = params.siteCode || params.siteId;
  return siteCode ? { siteCode } : {};
}

module.exports = {
  name: "stock",

  actions: {
    ping: {
      handler(ctx) {
        this.logger.info("Ping", { correlationId: ctx.meta.correlationId });
        return "pong";
      }
    },

    "level.list": {
      async handler(ctx) {
        const { prisma: db, lib: l } = await getCtx();
        const params = parseParams(l.levelListSchema, ctx.params, l);
        l.requireAuth(ctx, params.accessToken);

        const where = {
          deletedAt: null,
          ...buildSiteFilter(params),
          ...(params.code ? { code: params.code } : {})
        };

        const materials = await db.material.findMany({
          where,
          orderBy: [{ siteCode: "asc" }, { code: "asc" }]
        });

        return materials.map(l.toStockLevel);
      }
    },

    "level.consolidate": {
      async handler(ctx) {
        const { prisma: db, lib: l } = await getCtx();
        const params = parseParams(l.levelConsolidateSchema, ctx.params, l);
        l.requireAuth(ctx, params.accessToken);

        const materials = await db.material.findMany({
          where: {
            deletedAt: null,
            ...(params.code ? { code: params.code } : {})
          },
          orderBy: [{ code: "asc" }, { siteCode: "asc" }]
        });

        const levels = materials.map(l.toStockLevel);
        return l.consolidateByCode(levels);
      }
    },

    "movement.create": {
      async handler(ctx) {
        const { prisma: db, lib: l } = await getCtx();
        const params = parseParams(l.movementCreateSchema, ctx.params, l);
        l.requireLogistique(ctx, params.accessToken);

        const material = await l.loadActiveMaterial(db, params.materialId);

        if (material.siteCode !== params.siteCode) {
          throw l.createError(
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
          throw l.createError("INSUFFICIENT_STOCK");
        }

        const result = await db.$transaction(async (tx) => {
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

          await l.evaluateThreshold(tx, material.id);

          return movement;
        });

        l.publishStockEvent(this, "stock.movement.recorded", {
          movementId: result.id,
          materialId: material.id,
          type: params.type,
          quantity: params.quantity
        });

        this.logger.info("Stock movement recorded", {
          correlationId: ctx.meta.correlationId,
          movementId: result.id,
          materialId: material.id,
          type: params.type
        });

        return result;
      }
    },

    "movement.list": {
      async handler(ctx) {
        const { prisma: db, lib: l } = await getCtx();
        const params = parseParams(l.movementListSchema, ctx.params, l);
        l.requireAuth(ctx, params.accessToken);

        const where = {
          ...(params.siteCode ? { siteCode: params.siteCode } : {}),
          ...(params.materialId ? { materialId: params.materialId } : {}),
          ...(params.type ? { type: params.type } : {})
        };

        return db.stockMovement.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: params.limit ?? 100,
          skip: params.offset ?? 0
        });
      }
    },

    "reservation.create": {
      async handler(ctx) {
        const { prisma: db, lib: l } = await getCtx();
        const params = parseParams(l.reservationCreateSchema, ctx.params, l);
        l.requireLogistique(ctx, params.accessToken);

        const reservations = await db.$transaction(async (tx) => {
          const created = [];

          for (const line of params.lines) {
            const material = await l.loadActiveMaterial(tx, line.materialId);
            const available = l.computeAvailable(material);

            if (line.qty > available) {
              throw l.createError(
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

            await l.evaluateThreshold(tx, material.id);
            created.push(reservation);
          }

          return created;
        });

        l.publishStockEvent(this, "stock.reserved", {
          ofId: params.ofId,
          reservationIds: reservations.map((r) => r.id)
        });

        this.logger.info("Reservations created", {
          correlationId: ctx.meta.correlationId,
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
        const { prisma: db, lib: l } = await getCtx();
        const params = parseParams(l.alertListSchema, ctx.params, l);
        l.requireAuth(ctx, params.accessToken);

        const materials = await db.material.findMany({
          where: {
            deletedAt: null,
            ...(params.siteCode ? { siteCode: params.siteCode } : {})
          }
        });

        await db.$transaction(async (tx) => {
          for (const material of materials) {
            await l.evaluateThreshold(tx, material.id);
          }
        });

        return db.stockAlert.findMany({
          where: {
            ...(params.siteCode ? { siteCode: params.siteCode } : {}),
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
        const { prisma: db, lib: l } = await getCtx();
        const params = parseParams(l.thresholdUpsertSchema, ctx.params, l);
        l.requireLogistique(ctx, params.accessToken);

        const material = await l.loadActiveMaterial(db, params.materialId);

        const updated = await db.material.update({
          where: { id: material.id },
          data: { minimumStock: params.minimumStock }
        });

        const alert = await l.evaluateThreshold(db, material.id);

        return { material: l.toStockLevel(updated), alert };
      }
    },

    "forecast.rupture": {
      async handler(ctx) {
        const { prisma: db, lib: l } = await getCtx();
        const params = parseParams(l.forecastRuptureSchema, ctx.params, l);
        l.requireAuth(ctx, params.accessToken);

        const windowDays = params.windowDays ?? 30;
        const windowStart = new Date();
        windowStart.setDate(windowStart.getDate() - windowDays);

        const materials = await db.material.findMany({
          where: {
            deletedAt: null,
            ...(params.siteCode ? { siteCode: params.siteCode } : {})
          }
        });

        const results = [];

        for (const material of materials) {
          const aggregate = await db.stockMovement.aggregate({
            where: {
              materialId: material.id,
              type: "OUT",
              createdAt: { gte: windowStart }
            },
            _sum: { quantity: true }
          });

          const totalOut = aggregate._sum.quantity ?? 0;
          const dailyRate = totalOut / windowDays;
          const available = l.computeAvailable(material);
          let score;
          let estimatedDaysToRupture = null;

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
        const { prisma: db, lib: l } = await getCtx();
        const params = parseParams(l.supplierDelayListSchema, ctx.params, l);
        l.requireAuth(ctx, params.accessToken);

        return db.supplierDelay.findMany({
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
        const { prisma: db, lib: l } = await getCtx();
        const params = parseParams(l.supplierDelayNotifySchema, ctx.params, l);
        l.requireLogistique(ctx, params.accessToken);

        await l.loadActiveMaterial(db, params.materialId);

        const delay = await db.supplierDelay.create({
          data: {
            materialId: params.materialId,
            supplier: params.supplier,
            expectedDate: params.expectedDate,
            actualDate: params.actualDate,
            notes: params.notes
          }
        });

        l.publishStockEvent(this, "supplier.delay.reported", {
          delayId: delay.id,
          materialId: params.materialId,
          supplier: params.supplier
        });

        return delay;
      }
    }
  }
};

async function releaseOrCancel(ctx, finalStatus) {
  const { prisma: db, lib: l } = await getCtx();
  const params = parseParams(l.reservationByIdSchema, ctx.params, l);
  l.requireLogistique(ctx, params.accessToken);

  const reservation = await db.stockReservation.findUnique({
    where: { id: params.id }
  });

  if (!reservation) {
    throw l.createError("NOT_FOUND", `Reservation not found: ${params.id}`);
  }

  if (reservation.status !== "ACTIVE") {
    throw l.createError("RESERVATION_INACTIVE");
  }

  const updated = await db.$transaction(async (tx) => {
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
      await l.evaluateThreshold(tx, material.id);
    }

    return next;
  });

  l.publishStockEvent(this, "stock.released", {
    reservationId: updated.id,
    status: finalStatus
  });

  this.logger.info("Reservation transitioned", {
    correlationId: ctx.meta.correlationId,
    reservationId: updated.id,
    status: finalStatus
  });

  return updated;
}
