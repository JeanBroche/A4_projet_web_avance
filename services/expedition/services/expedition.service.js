"use strict"; 

/** @type {import("../src/generated/prisma/client.js").PrismaClient | null} */
let prisma = null;

/** @type {Record<string, Function> | null} */
let lib = null;

async function loadLib() {
    if (lib){
        return lib;
    }

    const [
        schemas,
        jwt,
        errors,
        rbac,
        events,
        dbMod
    ] = await Promise.all([
        import("../src/lib/schemas.mjs"),
        import("../src/lib/jwt.mjs"),
        import("../src/lib/errors.mjs"),
        import("../src/lib/rbac.mjs"),
        import("../src/lib/events.mjs"),
        import("../src/db.ts")
    ])

    prisma = dbMod.prisma;
    lib = {
        ...schemas,
        ...jwt,
        ...errors,
        ...rbac,
        ...events
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

async function transitionExpeditionStatus(ctx, updateStatus) {
    const { prisma: db, lib: l } = await getCtx();
    const params = parseParams(l.expeditionUpdateSchema, ctx.params, l);
    l.requireCommercial(ctx, params.accessToken);

    const expedition = await db.expedition.findUnique({
        where: { id: params.id }
    });

    if (!expedition) {
        throw l.createError("EXPEDITION_NOT_FOUND");
    }

    const allowedTransitions = {
        pending: ["in_progress", "cancelled"],
        in_progress: ["completed", "cancelled"],
        completed: [],
        cancelled: []
    };

    const allowed = allowedTransitions[expedition.status] || [];

    if (!allowed.includes(updateStatus)) {
        throw l.createError(
            "INVALID_STATUS_TRANSITION",
            `${expedition.status} → ${updateStatus} not allowed`
        );
    }

    const updated = await db.expedition.update({
        where: { id: params.id },
        data: {
            status: updateStatus,
            updatedAt: new Date()
        }
    });

    this.logger.info(`Expedition ${updateStatus}`, {
        id: updated.id,
        status: updated.status
    });

    return { expedition: updated };
}

module.exports = {
    name: "expedition",

    actions: {
        "expedition.list": {
            async handler(ctx) {
                const { prisma: db, lib: l } = await getCtx();
                const params = parseParams(l.expeditionListSchema, ctx.params, l);
                l.requireCommercial(ctx, params.accessToken);                

                const expeditions = await db.expedition.findMany({
                    where: {
                        ...(params.siteCode ? { siteCode: params.siteCode } : {}),
                        ...(params.status ? { status: params.status } : {}),
                        ...(params.shippedAt ? { shippedAt: params.shippedAt } : {}),
                        ...(params.code ? { code: params.code } : {}),
                        ...(params.deletedAt ? { deletedAt: null } : {})
                    },
                    orderBy: { createdAt: "desc" }
                })

                return { expeditions };

            }
        },

        "expedition.create": {
            async handler(ctx) {
                const { prisma: db, lib: l } = await getCtx();
                const params = parseParams(l.expeditionCreateSchema, ctx.params, l);
                l.requireCommercial(ctx, params.accessToken);

                const expedition = await db.expedition.create({
                    data: {
                        siteCode: params.siteCode,
                        code: params.code,
                        orderNumber: params.orderNumber,
                        expectedDeliveryDate: params.expectedDeliveryDate,
                        status: "pending",
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                });

                this.logger.info('Expedition created:', {
                    id: expedition.id,
                    code: expedition.code,
                    orderNumber: expedition.orderNumber,
                    siteCode: expedition.siteCode,
                    expectedDeliveryDate: expedition.expectedDeliveryDate,
                    status: expedition.status,
                    createdAt: expedition.createdAt,
                    updatedAt: expedition.updatedAt
                })

                return { expedition };
        
            }
        
        
        },

        "expedition.update": {
            async handler(ctx) {
                const { prisma: db, lib: l } = await getCtx();
                const params = parseParams(l.expeditionUpdateSchema, ctx.params, l);
                l.requireCommercial(ctx, params.accessToken);

                const expedition = await db.expedition.findUnique({
                    where: { id: params.id }
                });

                if (!expedition) {
                    throw l.createError("EXPEDITION_NOT_FOUND");
                }

                if (params.status) {
                    const allowed = allowedTransitions[expedition.status] || [];
                    if (!allowed.includes(params.status)) {
                        throw l.validationError(`Invalid status transition...`);
                    }
                }

                const updatedExpedition = await db.expedition.update({
                    where: { id: params.id },
                    data: {
                        ...(params.code ? { code: params.code } : {}),
                        ...(params.orderNumber ? { orderNumber: params.orderNumber } : {}),
                        ...(params.expectedDeliveryDate ? { expectedDeliveryDate: params.expectedDeliveryDate } : {}),
                        ...(params.shippedAt ? { shippedAt: params.shippedAt } : {}),
                        ...(params.siteCode ? { siteCode: params.siteCode } : {}),
                        ...(params.status ? { status: params.status } : {}),
                        updatedAt: new Date()
                    }
                });

                this.logger.info('Expedition updated:', {
                    id: updatedExpedition.id,
                    code: updatedExpedition.code,
                    orderNumber: updatedExpedition.orderNumber,
                    siteCode: updatedExpedition.siteCode,
                    expectedDeliveryDate: updatedExpedition.expectedDeliveryDate,
                    shippedAt: updatedExpedition.shippedAt,
                    status: updatedExpedition.status,
                    updatedAt: updatedExpedition.updatedAt
                })

                return { expedition: updatedExpedition };
            }
        },

        "expedition.delete": {
            async handler(ctx) {
                const { prisma: db, lib: l } = await getCtx();
                const params = parseParams(l.expeditionUpdateSchema, ctx.params, l);
                l.requireCommercial(ctx, params.accessToken);

                const expedition = await db.expedition.findUnique({
                    where: { id: params.id }
                });

                if (!expedition) {
                    throw l.createError("EXPEDITION_NOT_FOUND");
                }

                await db.expedition.update({
                    where: { id: params.id },
                    data: { deletedAt: new Date() }
                });

                this.logger.info('Expedition deleted:', {
                    id: expedition.id,
                    code: expedition.code,
                    orderNumber: expedition.orderNumber,
                    siteCode: expedition.siteCode,
                    expectedDeliveryDate: expedition.expectedDeliveryDate,
                    shippedAt: expedition.shippedAt,
                    status: expedition.status,
                    deletedAt: expedition.deletedAt
                })
            }
        },

        "expedition.completed": {
            async handler(ctx) {
                return transitionExpeditionStatus.call(this, ctx, "completed");
            }
        },

        "expedition.cancelled": {
            async handler(ctx) {
                return transitionExpeditionStatus.call(this, ctx, "cancelled");
            }
        }, 

        "expedition.in_progress": {
            async handler(ctx) {
                return transitionExpeditionStatus.call(this, ctx, "in_progress");
            }
        }
    

    }


}