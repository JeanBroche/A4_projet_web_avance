import { z } from "zod";
import { Context } from "moleculer";
import { prisma } from "../../src/db.js";
import { assertSiteAccess, createError, parseParams, requireAnyRole } from "@aeronexis/services-shared";
import { orderFinishSchema } from "../../src/lib/schemas.js";
import {
  buildOrderFinishedPayload,
  loadActiveOrder,
  ORDER_STATUSES,
  toOrderSummary
} from "../../src/lib/order-helpers.js";
import { publishOrderEvent } from "../../src/lib/events.js";
import { logOrderAudit } from "../../src/lib/audit.js";

type OrderFinishParams = z.infer<typeof orderFinishSchema>;
type AuthContextMeta = { correlationId: string };

export const orderFinishAction = {
  async handler(ctx: Context<OrderFinishParams, AuthContextMeta>) {
    const params = parseParams(orderFinishSchema, ctx.params);
    const auth = await requireAnyRole(ctx, params.accessToken, ["operateur", "commercial"]);

    const order = await loadActiveOrder(prisma, params.orderId);
    assertSiteAccess(auth, order.siteCode);

    if (order.status !== ORDER_STATUSES.IN_PRODUCTION) {
      throw createError(
        "ORDER_INVALID_STATUS_TRANSITION",
        `Order must be IN_PRODUCTION to finish, current status: ${order.status}`
      );
    }

    const payload = buildOrderFinishedPayload(order);
    if (payload.lines.length === 0) {
      throw createError("VALIDATION_ERROR", "Order has no lines to ship");
    }

    await prisma.orderStatusHistory.create({
      data: {
        orderId: order.id,
        fromStatus: order.status,
        toStatus: order.status,
        changedBy: auth.sub,
        notes: params.notes ?? "Production finished, ready for shipment"
      }
    });

    publishOrderEvent(ctx.service!, "order.order.finished", payload);

    ctx.service!.logger.info("Order finished, pick list requested", {
      correlationId: ctx.meta.correlationId,
      orderNumber: order.orderNumber
    });

    await logOrderAudit({
      action: "order.order.finish",
      actorId: auth.sub,
      actorEmail: auth.email,
      roles: auth.roles,
      entity: "CustomerOrder",
      entityId: order.id,
      siteCode: order.siteCode,
      correlationId: ctx.meta.correlationId,
      metadata: { orderNumber: order.orderNumber, event: "order.order.finished" }
    });

    return toOrderSummary(order);
  }
};
