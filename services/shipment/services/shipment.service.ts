import type { Context, Service, ServiceSchema } from "moleculer";
import { prisma } from "../src/db.js";
import {
  assertSiteAccess,
  createError,
  parseParams,
  requireAuth,
  requireLogistique
} from "@aeronexis/services-shared";
import {
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
} from "../src/lib/shipment-helpers.js";
import { initShipmentAuditWriter, logShipmentAudit } from "../src/lib/audit.js";
import { publishShipmentEvent } from "../src/lib/events.js";
import {
  pickListCompleteSchema,
  pickListCreateSchema,
  shipmentByIdSchema,
  shipmentHistorySchema,
  shipmentPlanSchema,
  shipmentUpdateStatusSchema
} from "../src/lib/schemas.js";

type OrderFinishedPayload = {
  orderNumber: string;
  siteCode: string;
  clientCode?: string;
  ofId?: string;
  lines?: Array<{ lineNumber?: number; productCode: string; quantity: number }>;
};

const ShipmentService: ServiceSchema = {
  name: "shipment",

  started(this: Service) {
    initShipmentAuditWriter(this);
  },

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
        const auth = await requireLogistique(ctx, params.accessToken);
        assertSiteAccess(auth, params.siteCode);

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

        await logShipmentAudit({
          action: "shipment.picklist.create",
          actorId: auth.sub,
          actorEmail: auth.email,
          roles: auth.roles,
          entity: "PickList",
          entityId: pickList.id,
          siteCode: pickList.siteCode,
          correlationId: (ctx.meta as { correlationId?: string }).correlationId,
          metadata: {
            code: pickList.code,
            orderNumber: pickList.orderNumber,
            ofId: pickList.ofId
          }
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
        const auth = await requireLogistique(ctx, params.accessToken);

        const pickList = await loadActivePickList(params.id);
        assertSiteAccess(auth, pickList.siteCode);

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

        await logShipmentAudit({
          action: "shipment.picklist.complete",
          actorId: auth.sub,
          actorEmail: auth.email,
          roles: auth.roles,
          entity: "PickList",
          entityId: completed.id,
          siteCode: completed.siteCode,
          correlationId: (ctx.meta as { correlationId?: string }).correlationId,
          metadata: { code: completed.code, orderNumber: completed.orderNumber },
          diff: {
            before: { status: pickList.status },
            after: { status: completed.status }
          }
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
        const auth = await requireLogistique(ctx, params.accessToken);

        const pickList = await loadActivePickList(params.pickListId);
        assertSiteAccess(auth, pickList.siteCode);

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

        publishShipmentEvent(this, "shipment.planned", {
          id: shipment.id,
          code: shipment.code,
          orderNumber: shipment.orderNumber,
          siteCode: shipment.siteCode
        });

        await logShipmentAudit({
          action: "shipment.shipment.plan",
          actorId: auth.sub,
          actorEmail: auth.email,
          roles: auth.roles,
          entity: "Shipment",
          entityId: shipment.id,
          siteCode: shipment.siteCode,
          correlationId: (ctx.meta as { correlationId?: string }).correlationId,
          metadata: {
            code: shipment.code,
            orderNumber: shipment.orderNumber,
            pickListId: shipment.pickListId
          }
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
        const auth = await requireAuth(ctx, params.accessToken);

        const shipment = await loadActiveShipment(params.id);
        assertSiteAccess(auth, shipment.siteCode);

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
        const auth = await requireAuth(ctx, params.accessToken);

        const shipment = await loadActiveShipment(params.id);
        assertSiteAccess(auth, shipment.siteCode);

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
        const auth = await requireLogistique(ctx, params.accessToken);

        const shipment = await loadActiveShipment(params.id);
        assertSiteAccess(auth, shipment.siteCode);
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

        publishShipmentEvent(this, "shipment.status.changed", {
          id: updated.id,
          code: updated.code,
          orderNumber: updated.orderNumber,
          ofId: shipment.pickList?.ofId ?? null,
          siteCode: updated.siteCode,
          fromStatus: shipment.status,
          toStatus: params.status
        });

        const now = new Date();
        if (
          updated.plannedShipDate &&
          updated.plannedShipDate < now &&
          !["DELIVERED", "CANCELLED"].includes(updated.status)
        ) {
          const daysLate = Math.ceil(
            (now.getTime() - updated.plannedShipDate.getTime()) / (24 * 60 * 60 * 1000)
          );
          publishShipmentEvent(this, "shipment.delivery.alert", {
            id: updated.id,
            code: updated.code,
            orderNumber: updated.orderNumber,
            siteCode: updated.siteCode,
            status: updated.status,
            plannedShipDate: updated.plannedShipDate,
            daysLate
          });
        }

        await logShipmentAudit({
          action: "shipment.shipment.updateStatus",
          actorId: auth.sub,
          actorEmail: auth.email,
          roles: auth.roles,
          entity: "Shipment",
          entityId: updated.id,
          siteCode: updated.siteCode,
          correlationId: (ctx.meta as { correlationId?: string }).correlationId,
          metadata: { code: updated.code, notes: params.notes },
          diff: {
            before: { status: shipment.status },
            after: { status: updated.status }
          }
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
        const auth = await requireAuth(ctx, params.accessToken);

        const effectiveSite = resolveSiteCode(params) || auth.siteId || undefined;
        if (effectiveSite) {
          assertSiteAccess(auth, effectiveSite);
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
    "order.order.finished": {
      async handler(this: Service, ctx: Context<OrderFinishedPayload>) {
        const payload = ctx.params;
        if (!payload.orderNumber || !payload.siteCode || !payload.lines?.length) {
          this.logger.warn("order.order.finished ignored: incomplete payload", { payload });
          return;
        }

        const existing = await prisma.pickList.findFirst({
          where: { orderNumber: payload.orderNumber, deletedAt: null }
        });
        if (existing) {
          this.logger.info("order.order.finished skipped: pick list already exists", {
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

        publishShipmentEvent(this, "shipment.picklist.auto_created", {
          pickListId: pickList.id,
          orderNumber: pickList.orderNumber,
          siteCode: pickList.siteCode
        });

        await logShipmentAudit({
          action: "shipment.picklist.auto_created",
          entity: "PickList",
          entityId: pickList.id,
          siteCode: pickList.siteCode,
          correlationId: (ctx.meta as { correlationId?: string }).correlationId,
          metadata: {
            code: pickList.code,
            orderNumber: pickList.orderNumber,
            ofId: pickList.ofId,
            source: "order.order.finished"
          }
        });

        this.logger.info("Auto-created pick list from order.order.finished", {
          pickListId: pickList.id,
          orderNumber: pickList.orderNumber
        });
      }
    }
  }
};

export default ShipmentService;
