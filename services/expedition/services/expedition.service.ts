import type { Context, Service, ServiceSchema } from "moleculer";
import type { ZodType } from "zod";
import { prisma } from "../src/db.js";
import { createError, parseOrThrow } from "../src/lib/errors.js";
import {
  assertSiteAccess,
  assertShipmentTransition,
  buildHistoryFilter,
  generatePickListCode,
  generateShipmentCode,
  loadActivePickList,
  loadActiveShipment,
  PICKLIST_STATUS,
  resolveSiteCode,
  shipmentStatusSideEffects,
  toPickListSummary,
  toShipmentSummary,
  toTrackingTimeline,
  verifyStockReservations
} from "../src/lib/expedition-helpers.js";
import { publishExpeditionEvent } from "../src/lib/events.js";
import { requireAuth, requireLogistique } from "../src/lib/rbac.js";
import {
  pickListCompleteSchema,
  pickListCreateSchema,
  shipmentByIdSchema,
  shipmentHistorySchema,
  shipmentPlanSchema,
  shipmentUpdateStatusSchema
} from "../src/lib/schemas.js";

function parseParams<T>(schema: ZodType<T>, raw: unknown): T {
  try {
    return schema.parse(raw);
  } catch (error) {
    parseOrThrow(error);
  }
}

type OrderFinishedPayload = {
  orderNumber: string;
  siteCode: string;
  clientCode?: string;
  ofId?: string;
  lines?: Array<{ lineNumber?: number; productCode: string; quantity: number }>;
};

const ExpeditionService: ServiceSchema = {
  name: "expedition",

  actions: {
    ping: {
      handler(ctx) {
        this.logger.info("Ping", { correlationId: ctx.meta.correlationId });
        return "pong";
      }
    },

    "picklist.create": {
      async handler(ctx: Context) {
        const params = parseParams(pickListCreateSchema, ctx.params);
        const auth = requireLogistique(ctx, params.accessToken);
        assertSiteAccess(auth.siteId, params.siteCode);

        await verifyStockReservations(ctx, {
          ofId: params.ofId,
          siteCode: params.siteCode,
          accessToken: params.accessToken
        });

        const code = await generatePickListCode(prisma);
        const pickList = await prisma.$transaction(async (tx) => {
          const created = await tx.pickList.create({
            data: {
              code,
              orderNumber: params.orderNumber,
              ofId: params.ofId,
              clientCode: params.clientCode,
              siteCode: params.siteCode,
              status: PICKLIST_STATUS.PENDING,
              lines: {
                create: params.lines.map((line, index) => ({
                  lineNumber: line.lineNumber ?? index + 1,
                  productCode: line.productCode,
                  quantity: line.quantity
                }))
              }
            },
            include: { lines: { orderBy: { lineNumber: "asc" } } }
          });
          return created;
        });

        this.logger.info("Pick list created", {
          correlationId: (ctx.meta as { correlationId?: string }).correlationId,
          id: pickList.id,
          code: pickList.code,
          orderNumber: pickList.orderNumber
        });

        return { pickList: toPickListSummary(pickList) };
      }
    },

    "picklist.complete": {
      async handler(ctx: Context) {
        const params = parseParams(pickListCompleteSchema, ctx.params);
        const auth = requireLogistique(ctx, params.accessToken);

        const pickList = await loadActivePickList(params.id);
        assertSiteAccess(auth.siteId, pickList.siteCode);

        if (pickList.status === PICKLIST_STATUS.COMPLETED) {
          throw createError("PICKLIST_ALREADY_COMPLETED");
        }

        await verifyStockReservations(ctx, {
          ofId: pickList.ofId,
          siteCode: pickList.siteCode,
          accessToken: params.accessToken
        });

        const completed = await prisma.$transaction(async (tx) => {
          if (params.lines?.length) {
            for (const lineUpdate of params.lines) {
              const line = pickList.lines.find((l) => l.id === lineUpdate.id);
              if (!line) {
                throw createError("NOT_FOUND", `Pick list line not found: ${lineUpdate.id}`);
              }
              await tx.pickListLine.update({
                where: { id: lineUpdate.id },
                data: { pickedQty: lineUpdate.pickedQty }
              });
            }
          } else {
            for (const line of pickList.lines) {
              await tx.pickListLine.update({
                where: { id: line.id },
                data: { pickedQty: line.quantity }
              });
            }
          }

          return tx.pickList.update({
            where: { id: pickList.id },
            data: { status: PICKLIST_STATUS.COMPLETED },
            include: { lines: { orderBy: { lineNumber: "asc" } } }
          });
        });

        this.logger.info("Pick list completed", {
          correlationId: (ctx.meta as { correlationId?: string }).correlationId,
          id: completed.id,
          code: completed.code
        });

        return { pickList: toPickListSummary(completed) };
      }
    },

    "shipment.plan": {
      async handler(this: Service, ctx: Context) {
        const params = parseParams(shipmentPlanSchema, ctx.params);
        const auth = requireLogistique(ctx, params.accessToken);

        const pickList = await loadActivePickList(params.pickListId);
        assertSiteAccess(auth.siteId, pickList.siteCode);

        if (pickList.status !== PICKLIST_STATUS.COMPLETED) {
          throw createError("PICKLIST_NOT_COMPLETED");
        }

        const existingShipment = await prisma.shipment.findUnique({
          where: { pickListId: pickList.id }
        });
        if (existingShipment) {
          throw createError("SHIPMENT_ALREADY_EXISTS");
        }

        const code = params.code || (await generateShipmentCode(prisma));
        const shipment = await prisma.$transaction(async (tx) => {
          const created = await tx.shipment.create({
            data: {
              code,
              pickListId: pickList.id,
              orderNumber: pickList.orderNumber,
              clientCode: pickList.clientCode,
              siteCode: pickList.siteCode,
              carrier: params.carrier,
              plannedShipDate: params.plannedShipDate,
              trackingEvents: {
                create: {
                  fromStatus: null,
                  toStatus: "PLANNED",
                  notes: "Shipment planned"
                }
              }
            },
            include: { trackingEvents: { orderBy: { createdAt: "asc" } } }
          });
          return created;
        });

        publishExpeditionEvent(this, "shipment.planned", {
          id: shipment.id,
          code: shipment.code,
          orderNumber: shipment.orderNumber,
          siteCode: shipment.siteCode
        });

        this.logger.info("Shipment planned", {
          correlationId: (ctx.meta as { correlationId?: string }).correlationId,
          id: shipment.id,
          code: shipment.code
        });

        return { shipment: toShipmentSummary(shipment) };
      }
    },

    "shipment.get": {
      async handler(ctx: Context) {
        const params = parseParams(shipmentByIdSchema, ctx.params);
        const auth = requireAuth(ctx, params.accessToken);

        const shipment = await loadActiveShipment(params.id);
        assertSiteAccess(auth.siteId, shipment.siteCode);

        return {
          shipment: {
            ...toShipmentSummary(shipment),
            trackingEvents: toTrackingTimeline(shipment.trackingEvents || [])
          }
        };
      }
    },

    "shipment.track": {
      async handler(ctx: Context) {
        const params = parseParams(shipmentByIdSchema, ctx.params);
        const auth = requireAuth(ctx, params.accessToken);

        const shipment = await loadActiveShipment(params.id);
        assertSiteAccess(auth.siteId, shipment.siteCode);

        return {
          shipmentId: shipment.id,
          code: shipment.code,
          status: shipment.status,
          timeline: toTrackingTimeline(shipment.trackingEvents || [])
        };
      }
    },

    "shipment.updateStatus": {
      async handler(this: Service, ctx: Context) {
        const params = parseParams(shipmentUpdateStatusSchema, ctx.params);
        const auth = requireLogistique(ctx, params.accessToken);

        const shipment = await loadActiveShipment(params.id);
        assertSiteAccess(auth.siteId, shipment.siteCode);
        assertShipmentTransition(shipment.status, params.status);

        const sideEffects = shipmentStatusSideEffects(params.status);
        const updated = await prisma.$transaction(async (tx) => {
          const next = await tx.shipment.update({
            where: { id: shipment.id },
            data: {
              status: params.status,
              ...sideEffects,
              ...(params.status === "IN_TRANSIT" && !shipment.shippedAt
                ? { shippedAt: new Date() }
                : {}),
              ...(params.status === "DELIVERED"
                ? {
                    deliveredAt: new Date(),
                    shippedAt: shipment.shippedAt || new Date()
                  }
                : {})
            },
            include: { trackingEvents: { orderBy: { createdAt: "asc" } } }
          });

          await tx.shipmentTrackingEvent.create({
            data: {
              shipmentId: shipment.id,
              fromStatus: shipment.status,
              toStatus: params.status,
              notes: params.notes
            }
          });

          return next;
        });

        publishExpeditionEvent(this, "shipment.status.changed", {
          id: updated.id,
          code: updated.code,
          fromStatus: shipment.status,
          toStatus: params.status
        });

        this.logger.info("Shipment status updated", {
          correlationId: (ctx.meta as { correlationId?: string }).correlationId,
          id: updated.id,
          status: updated.status
        });

        return { shipment: toShipmentSummary(updated) };
      }
    },

    "shipment.history": {
      async handler(ctx: Context) {
        const params = parseParams(shipmentHistorySchema, ctx.params);
        const auth = requireAuth(ctx, params.accessToken);

        const effectiveSite = resolveSiteCode(params) || auth.siteId || undefined;
        if (effectiveSite) {
          assertSiteAccess(auth.siteId, effectiveSite);
        }

        const page = params.page ?? 1;
        const pageSize = params.pageSize ?? 20;
        const where = buildHistoryFilter({
          siteCode: effectiveSite,
          clientCode: params.clientCode,
          status: params.status,
          dateFrom: params.dateFrom,
          dateTo: params.dateTo
        });

        const [items, total] = await Promise.all([
          prisma.shipment.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * pageSize,
            take: pageSize
          }),
          prisma.shipment.count({ where })
        ]);

        return {
          items: items.map(toShipmentSummary),
          pagination: {
            page,
            pageSize,
            total,
            totalPages: Math.ceil(total / pageSize)
          }
        };
      }
    }
  },

  events: {
    "commande.order.finished": {
      async handler(this: Service, ctx: Context<OrderFinishedPayload>) {
        const payload = ctx.params;
        if (!payload.orderNumber || !payload.siteCode || !payload.lines?.length) {
          this.logger.warn("commande.order.finished ignored: incomplete payload", { payload });
          return;
        }

        const existing = await prisma.pickList.findFirst({
          where: { orderNumber: payload.orderNumber, deletedAt: null }
        });
        if (existing) {
          this.logger.info("commande.order.finished skipped: pick list already exists", {
            orderNumber: payload.orderNumber
          });
          return;
        }

        const code = await generatePickListCode(prisma);
        const pickList = await prisma.pickList.create({
          data: {
            code,
            orderNumber: payload.orderNumber,
            ofId: payload.ofId,
            clientCode: payload.clientCode,
            siteCode: payload.siteCode,
            status: PICKLIST_STATUS.PENDING,
            lines: {
              create: payload.lines.map((line, index) => ({
                lineNumber: line.lineNumber ?? index + 1,
                productCode: line.productCode,
                quantity: line.quantity
              }))
            }
          },
          include: { lines: true }
        });

        publishExpeditionEvent(this, "expedition.picklist.auto_created", {
          pickListId: pickList.id,
          orderNumber: pickList.orderNumber,
          siteCode: pickList.siteCode
        });

        this.logger.info("Auto-created pick list from commande.order.finished", {
          pickListId: pickList.id,
          orderNumber: pickList.orderNumber
        });
      }
    }
  }
};

export default ExpeditionService;
