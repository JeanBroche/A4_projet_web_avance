import { z } from "zod";
import { Errors, Context } from "moleculer";
import { prisma } from "../../src/db.js";
import { assertSiteAccess, parseParams, requireLogistique } from "@aeronexis/services-shared";
import { orderMarkShippedSchema } from "../../src/lib/schemas.js";
import {
  applyOrderStatusTransition,
  loadActiveOrder,
  ORDER_STATUSES,
  toOrderSummary
} from "../../src/lib/order-helpers.js";
import { publishOrderEvent } from "../../src/lib/events.js";
import { logOrderAudit } from "../../src/lib/audit.js";

type OrderMarkShippedParams = z.infer<typeof orderMarkShippedSchema>;
type AuthContextMeta = { correlationId: string };

type ShipmentHistoryPage = {
  items: Array<{ orderNumber: string; status: string }>;
};

export const orderMarkShippedAction = {
  async handler(ctx: Context<OrderMarkShippedParams, AuthContextMeta>) {
    const params = parseParams(orderMarkShippedSchema, ctx.params);
    const auth = requireLogistique(ctx, params.accessToken);

    const order = await loadActiveOrder(prisma, params.orderId);
    assertSiteAccess(auth, order.siteCode);

    try {
      const history = await ctx.call<ShipmentHistoryPage, Record<string, unknown>>(
        "shipment.shipment.history",
        {
          accessToken: params.accessToken,
          siteCode: order.siteCode,
          page: 1,
          pageSize: 100
        }
      );
      const hasActiveShipment = history.items.some(
        (item) =>
          item.orderNumber === order.orderNumber && item.status !== "CANCELLED"
      );
      if (!hasActiveShipment) {
        ctx.service!.logger.warn("No active shipment found for order", {
          orderNumber: order.orderNumber
        });
      }
    } catch (error) {
      const code =
        error instanceof Errors.MoleculerClientError ? error.code : undefined;
      if (code !== 404 && code !== 501) {
        throw error;
      }
    }

    const updated = await applyOrderStatusTransition(
      prisma,
      order,
      ORDER_STATUSES.SHIPPED,
      auth.sub,
      params.notes ?? "Order shipped"
    );

    publishOrderEvent(ctx.service!, "order.order.shipped", {
      orderId: updated.id,
      orderNumber: updated.orderNumber,
      siteCode: updated.siteCode
    });

    await logOrderAudit({
      action: "order.order.markShipped",
      actorId: auth.sub,
      actorEmail: auth.email,
      roles: auth.roles,
      entity: "CustomerOrder",
      entityId: updated.id,
      siteCode: updated.siteCode,
      correlationId: ctx.meta.correlationId,
      metadata: { orderNumber: updated.orderNumber },
      diff: {
        before: { status: order.status },
        after: { status: updated.status }
      }
    });

    return toOrderSummary(updated);
  }
};
