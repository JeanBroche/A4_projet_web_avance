import type { ServiceSchema } from "moleculer";
import type { ZodType } from "zod";
import { prisma } from "../src/db.js";
import { createError, parseOrThrow } from "../src/lib/errors.js";
import { publishCommandeEvent } from "../src/lib/events.js";
import {
  ORDER_STATUSES,
  VALIDATION_ACTIONS,
  assertSiteAccess,
  assertStatusTransition,
  computeClientStats,
  computeDelayRisk,
  computeTotalAmount,
  generateOrderNumber,
  loadActiveClient,
  loadActiveOrder,
  toOrderSummary
} from "../src/lib/order-helpers.js";
import { requireAuth, requireCommercial } from "../src/lib/rbac.js";
import {
  clientStatsSchema,
  orderByIdSchema,
  orderCreateSchema,
  orderDelayRiskSchema,
  orderHistorySchema,
  orderListUrgentSchema,
  orderRejectSchema,
  orderSetPrioritySchema,
  orderValidateSchema
} from "../src/lib/schemas.js";

function parseParams<T>(schema: ZodType<T>, raw: unknown): T {
  try {
    return schema.parse(raw);
  } catch (error) {
    parseOrThrow(error);
  }
}

function resolveSiteCode(params: { siteCode?: string; siteId?: string }) {
  return params.siteCode || params.siteId || null;
}

const CommandeService: ServiceSchema = {
  name: "commande",

  actions: {
    ping: {
      handler(ctx) {
        this.logger.info("Ping", { correlationId: ctx.meta.correlationId });
        return "pong";
      }
    },

    "order.create": {
      async handler(ctx) {
        const params = parseParams(orderCreateSchema, ctx.params);
        const auth = requireCommercial(ctx, params.accessToken);

        const client = await loadActiveClient(prisma, params.clientId);

        if (client.siteCode !== params.siteCode) {
          throw createError(
            "VALIDATION_ERROR",
            `Client ${client.code} does not belong to site ${params.siteCode}`
          );
        }

        assertSiteAccess(auth.siteId, params.siteCode);

        const totalAmount = computeTotalAmount(params.lines);

        const order = await prisma.$transaction(async (tx) => {
          const orderNumber = await generateOrderNumber(tx);

          return tx.customerOrder.create({
            data: {
              orderNumber,
              clientId: client.id,
              siteCode: params.siteCode,
              status: ORDER_STATUSES.DRAFT,
              isUrgent: params.isUrgent ?? false,
              dueDate: params.dueDate,
              promisedDeliveryDate: params.promisedDeliveryDate,
              totalAmount,
              lines: {
                create: params.lines.map((line, index) => ({
                  lineNumber: index + 1,
                  productCode: line.productCode,
                  description: line.description,
                  quantity: line.quantity,
                  unitPrice: line.unitPrice,
                  ofId: line.ofId
                }))
              },
              statusHistory: {
                create: {
                  fromStatus: null,
                  toStatus: ORDER_STATUSES.DRAFT,
                  changedBy: auth.sub,
                  notes: "Order created"
                }
              }
            },
            include: {
              client: true,
              lines: { where: { deletedAt: null }, orderBy: { lineNumber: "asc" } }
            }
          });
        });

        publishCommandeEvent(this, "order.created", {
          orderId: order.id,
          orderNumber: order.orderNumber,
          clientId: order.clientId,
          siteCode: order.siteCode
        });

        this.logger.info("Order created", {
          correlationId: ctx.meta.correlationId,
          orderId: order.id,
          orderNumber: order.orderNumber
        });

        return toOrderSummary(order);
      }
    },

    "order.get": {
      async handler(ctx) {
        const params = parseParams(orderByIdSchema, ctx.params);
        const auth = requireAuth(ctx, params.accessToken);

        const order = await loadActiveOrder(prisma, params.orderId);
        assertSiteAccess(auth.siteId, order.siteCode);

        const siteCode = resolveSiteCode(params);
        if (siteCode && order.siteCode !== siteCode) {
          throw createError("NOT_FOUND", `Order not found: ${params.orderId}`);
        }

        return toOrderSummary(order);
      }
    },

    "order.status": {
      async handler(ctx) {
        const params = parseParams(orderByIdSchema, ctx.params);
        const auth = requireAuth(ctx, params.accessToken);

        const order = await loadActiveOrder(prisma, params.orderId);
        assertSiteAccess(auth.siteId, order.siteCode);

        const history = await prisma.orderStatusHistory.findMany({
          where: { orderId: order.id },
          orderBy: { createdAt: "asc" }
        });

        return {
          orderId: order.id,
          orderNumber: order.orderNumber,
          currentStatus: order.status,
          history: history.map((entry) => ({
            id: entry.id,
            fromStatus: entry.fromStatus,
            toStatus: entry.toStatus,
            changedBy: entry.changedBy,
            notes: entry.notes,
            createdAt: entry.createdAt
          }))
        };
      }
    },

    "order.setPriority": {
      async handler(ctx) {
        const params = parseParams(orderSetPrioritySchema, ctx.params);
        requireCommercial(ctx, params.accessToken);

        const order = await loadActiveOrder(prisma, params.orderId);

        if (order.status === ORDER_STATUSES.REJECTED) {
          throw createError("ORDER_NOT_EDITABLE");
        }

        const updated = await prisma.customerOrder.update({
          where: { id: order.id },
          data: {
            isUrgent: params.isUrgent,
            dueDate: params.isUrgent ? params.dueDate ?? order.dueDate : null
          },
          include: {
            client: true,
            lines: { where: { deletedAt: null }, orderBy: { lineNumber: "asc" } }
          }
        });

        publishCommandeEvent(this, "order.priority.changed", {
          orderId: updated.id,
          orderNumber: updated.orderNumber,
          isUrgent: updated.isUrgent,
          dueDate: updated.dueDate
        });

        return toOrderSummary(updated);
      }
    },

    "order.listUrgent": {
      async handler(ctx) {
        const params = parseParams(orderListUrgentSchema, ctx.params);
        const auth = requireAuth(ctx, params.accessToken);

        const siteCode = resolveSiteCode(params);
        if (auth.siteId && siteCode && auth.siteId !== siteCode) {
          throw createError("FORBIDDEN");
        }

        const effectiveSite = auth.siteId || siteCode;

        const orders = await prisma.customerOrder.findMany({
          where: {
            deletedAt: null,
            isUrgent: true,
            status: {
              notIn: [ORDER_STATUSES.REJECTED, ORDER_STATUSES.DELIVERED]
            },
            ...(effectiveSite ? { siteCode: effectiveSite } : {})
          },
          orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
          include: {
            client: true,
            lines: { where: { deletedAt: null }, orderBy: { lineNumber: "asc" } }
          }
        });

        return orders.map(toOrderSummary);
      }
    },

    "order.delayRisk": {
      async handler(ctx) {
        const params = parseParams(orderDelayRiskSchema, ctx.params);
        const auth = requireAuth(ctx, params.accessToken);

        const order = await loadActiveOrder(prisma, params.orderId);
        assertSiteAccess(auth.siteId, order.siteCode);

        const risk = computeDelayRisk(order);

        return {
          orderId: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          isUrgent: order.isUrgent,
          ...risk
        };
      }
    },

    "client.stats": {
      async handler(ctx) {
        const params = parseParams(clientStatsSchema, ctx.params);
        const auth = requireAuth(ctx, params.accessToken);

        const client = await loadActiveClient(prisma, params.clientId);
        assertSiteAccess(auth.siteId, client.siteCode);

        const orders = await prisma.customerOrder.findMany({
          where: {
            clientId: client.id,
            deletedAt: null
          }
        });

        return {
          clientId: client.id,
          clientCode: client.code,
          clientName: client.name,
          siteCode: client.siteCode,
          stats: computeClientStats(orders)
        };
      }
    },

    "order.history": {
      async handler(ctx) {
        const params = parseParams(orderHistorySchema, ctx.params);
        const auth = requireAuth(ctx, params.accessToken);

        const siteCode = resolveSiteCode(params);
        if (auth.siteId && siteCode && auth.siteId !== siteCode) {
          throw createError("FORBIDDEN");
        }

        const effectiveSite = auth.siteId || siteCode;

        if (params.clientId) {
          const client = await loadActiveClient(prisma, params.clientId);
          assertSiteAccess(auth.siteId, client.siteCode);
        }

        const where = {
          deletedAt: null,
          ...(params.clientId ? { clientId: params.clientId } : {}),
          ...(effectiveSite ? { siteCode: effectiveSite } : {})
        };

        const [items, total] = await Promise.all([
          prisma.customerOrder.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: params.limit ?? 50,
            skip: params.offset ?? 0,
            include: {
              client: true,
              lines: { where: { deletedAt: null }, orderBy: { lineNumber: "asc" } }
            }
          }),
          prisma.customerOrder.count({ where })
        ]);

        return {
          total,
          limit: params.limit ?? 50,
          offset: params.offset ?? 0,
          items: items.map(toOrderSummary)
        };
      }
    },

    "order.validate": {
      async handler(ctx) {
        const params = parseParams(orderValidateSchema, ctx.params);
        const auth = requireCommercial(ctx, params.accessToken);

        const order = await loadActiveOrder(prisma, params.orderId);
        assertStatusTransition(order.status, ORDER_STATUSES.VALIDATED);

        const updated = await prisma.$transaction(async (tx) => {
          const next = await tx.customerOrder.update({
            where: { id: order.id },
            data: { status: ORDER_STATUSES.VALIDATED },
            include: {
              client: true,
              lines: { where: { deletedAt: null }, orderBy: { lineNumber: "asc" } }
            }
          });

          await tx.orderStatusHistory.create({
            data: {
              orderId: order.id,
              fromStatus: order.status,
              toStatus: ORDER_STATUSES.VALIDATED,
              changedBy: auth.sub,
              notes: params.notes
            }
          });

          await tx.orderValidation.create({
            data: {
              orderId: order.id,
              action: VALIDATION_ACTIONS.VALIDATE,
              validatedBy: auth.sub,
              reason: params.notes
            }
          });

          return next;
        });

        publishCommandeEvent(this, "order.validated", {
          orderId: updated.id,
          orderNumber: updated.orderNumber,
          status: updated.status
        });

        this.logger.info("Order validated", {
          correlationId: ctx.meta.correlationId,
          orderId: updated.id,
          orderNumber: updated.orderNumber
        });

        return toOrderSummary(updated);
      }
    },

    "order.reject": {
      async handler(ctx) {
        const params = parseParams(orderRejectSchema, ctx.params);
        const auth = requireCommercial(ctx, params.accessToken);

        const order = await loadActiveOrder(prisma, params.orderId);
        assertStatusTransition(order.status, ORDER_STATUSES.REJECTED);

        const updated = await prisma.$transaction(async (tx) => {
          const next = await tx.customerOrder.update({
            where: { id: order.id },
            data: { status: ORDER_STATUSES.REJECTED },
            include: {
              client: true,
              lines: { where: { deletedAt: null }, orderBy: { lineNumber: "asc" } }
            }
          });

          await tx.orderStatusHistory.create({
            data: {
              orderId: order.id,
              fromStatus: order.status,
              toStatus: ORDER_STATUSES.REJECTED,
              changedBy: auth.sub,
              notes: params.reason
            }
          });

          await tx.orderValidation.create({
            data: {
              orderId: order.id,
              action: VALIDATION_ACTIONS.REJECT,
              validatedBy: auth.sub,
              reason: params.reason
            }
          });

          return next;
        });

        return toOrderSummary(updated);
      }
    }
  }
};

export default CommandeService;
