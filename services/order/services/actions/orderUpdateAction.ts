import { z } from "zod";
import { Context } from "moleculer";
import { prisma } from "../../src/db.js";
import {
  assertSiteAccess,
  createError,
  parseParams,
  requireCommercial
} from "@aeronexis/services-shared";
import { orderUpdateSchema } from "../../src/lib/schemas.js";
import {
  computeTotalAmount,
  loadActiveOrder,
  ORDER_STATUSES,
  toOrderSummary
} from "../../src/lib/order-helpers.js";
import { logOrderAudit } from "../../src/lib/audit.js";

type OrderUpdateParams = z.infer<typeof orderUpdateSchema>;
type AuthContextMeta = { correlationId: string };

const NON_EDITABLE_STATUSES = new Set<string>([
  ORDER_STATUSES.REJECTED,
  ORDER_STATUSES.DELIVERED
]);

async function resolveClientByName(siteCode: string, clientName: string) {
  const existing = await prisma.client.findFirst({
    where: {
      siteCode,
      deletedAt: null,
      OR: [{ name: clientName }, { code: clientName }]
    }
  });

  if (existing) return existing;

  return prisma.client.create({
    data: {
      code: clientName.toUpperCase().replace(/\s+/g, "-").slice(0, 20),
      name: clientName,
      siteCode,
      country: "FR",
      type: "industrial",
      status: "active"
    }
  });
}

export const orderUpdateAction = {
  async handler(ctx: Context<OrderUpdateParams, AuthContextMeta>) {
    const params = parseParams(orderUpdateSchema, ctx.params);
    const auth = await requireCommercial(ctx, params.accessToken);

    const order = await loadActiveOrder(prisma, params.orderId);
    assertSiteAccess(auth, order.siteCode);

    if (NON_EDITABLE_STATUSES.has(order.status)) {
      throw createError("ORDER_NOT_EDITABLE", `Order ${order.orderNumber} cannot be edited`);
    }

    const firstLine = order.lines?.[0];
    const orderData: Record<string, unknown> = {};

    if (params.clientName) {
      const client = await resolveClientByName(order.siteCode, params.clientName);
      orderData.clientId = client.id;
    }

    if (params.promisedDeliveryDate !== undefined) {
      orderData.promisedDeliveryDate = params.promisedDeliveryDate;
    }

    if (params.isUrgent !== undefined) {
      orderData.isUrgent = params.isUrgent;
    }

    if (params.carrier !== undefined) {
      orderData.carrier = params.carrier;
    }

    if (params.emoji !== undefined) {
      orderData.emoji = params.emoji;
    }

    if (params.destination !== undefined) {
      orderData.deliveryAddress = params.destination;
    }

    const lineUpdates: { description?: string; quantity?: number } = {};
    if (params.destination !== undefined) {
      lineUpdates.description = params.destination;
    }
    if (params.itemsCount !== undefined) {
      lineUpdates.quantity = params.itemsCount;
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (firstLine && Object.keys(lineUpdates).length > 0) {
        const quantity = lineUpdates.quantity ?? firstLine.quantity;
        const unitPrice = firstLine.unitPrice ?? 0;
        await tx.customerOrderLine.update({
          where: { id: firstLine.id },
          data: lineUpdates
        });
        orderData.totalAmount = computeTotalAmount([{ quantity, unitPrice }]);
      }

      return tx.customerOrder.update({
        where: { id: order.id },
        data: orderData,
        include: {
          client: true,
          lines: { where: { deletedAt: null }, orderBy: { lineNumber: "asc" } }
        }
      });
    });

    await logOrderAudit({
      action: "order.order.update",
      actorId: auth.sub,
      actorEmail: auth.email,
      roles: auth.roles,
      entity: "CustomerOrder",
      entityId: updated.id,
      siteCode: updated.siteCode,
      correlationId: ctx.meta.correlationId,
      metadata: { orderNumber: updated.orderNumber },
      diff: {
        before: {
          clientId: order.clientId,
          promisedDeliveryDate: order.promisedDeliveryDate,
          isUrgent: order.isUrgent,
          carrier: order.carrier,
          deliveryAddress: order.deliveryAddress
        },
        after: {
          clientId: updated.clientId,
          promisedDeliveryDate: updated.promisedDeliveryDate,
          isUrgent: updated.isUrgent,
          carrier: updated.carrier,
          deliveryAddress: updated.deliveryAddress
        }
      }
    });

    return toOrderSummary(updated);
  }
};
