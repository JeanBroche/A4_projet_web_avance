import { z } from "zod";
import { Context } from "moleculer";
import { prisma } from "../../src/db.js";
import { assertSiteAccess, parseParams, requireLogistique } from "@aeronexis/services-shared";
import { orderMarkDeliveredSchema } from "../../src/lib/schemas.js";
import {
  applyOrderStatusTransition,
  loadActiveOrder,
  ORDER_STATUSES,
  toOrderSummary
} from "../../src/lib/order-helpers.js";
import { publishOrderEvent } from "../../src/lib/events.js";
import { logOrderAudit } from "../../src/lib/audit.js";

type OrderMarkDeliveredParams = z.infer<typeof orderMarkDeliveredSchema>;
type AuthContextMeta = { correlationId: string };

export const orderMarkDeliveredAction = {
  async handler(ctx: Context<OrderMarkDeliveredParams, AuthContextMeta>) {
    const params = parseParams(orderMarkDeliveredSchema, ctx.params);
    const auth = await requireLogistique(ctx, params.accessToken);

    const order = await loadActiveOrder(prisma, params.orderId);
    assertSiteAccess(auth, order.siteCode);

    const updated = await applyOrderStatusTransition(
      prisma,
      order,
      ORDER_STATUSES.DELIVERED,
      auth.sub,
      params.notes ?? "Order delivered"
    );

    publishOrderEvent(ctx.service!, "order.order.delivered", {
      orderId: updated.id,
      orderNumber: updated.orderNumber,
      siteCode: updated.siteCode
    });

    await logOrderAudit({
      action: "order.order.markDelivered",
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
