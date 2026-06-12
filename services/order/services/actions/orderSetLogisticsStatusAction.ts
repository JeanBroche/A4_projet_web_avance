import { z } from "zod";
import { Context } from "moleculer";
import { prisma } from "../../src/db.js";
import {
  assertSiteAccess,
  parseParams,
  requireAnyRole
} from "@aeronexis/services-shared";
import { orderSetLogisticsStatusSchema } from "../../src/lib/schemas.js";
import {
  applyOrderStatusTransition,
  loadActiveOrder,
  mapUiLogisticsToOrderStatus,
  ORDER_STATUSES,
  toOrderSummary
} from "../../src/lib/order-helpers.js";
import { publishOrderEvent } from "../../src/lib/events.js";
import { DomainEvents } from "@aeronexis/shared";
import { logOrderAudit } from "../../src/lib/audit.js";

type OrderSetLogisticsStatusParams = z.infer<typeof orderSetLogisticsStatusSchema>;
type AuthContextMeta = { correlationId: string };

export const orderSetLogisticsStatusAction = {
  async handler(ctx: Context<OrderSetLogisticsStatusParams, AuthContextMeta>) {
    const params = parseParams(orderSetLogisticsStatusSchema, ctx.params);
    const auth = await requireAnyRole(ctx, params.accessToken, [
      "commercial",
      "logistique"
    ]);

    const order = await loadActiveOrder(prisma, params.orderId);
    assertSiteAccess(auth, order.siteCode);

    const nextStatus = mapUiLogisticsToOrderStatus(params.status);

    if (order.status === nextStatus) {
      return toOrderSummary(order);
    }

    const wasDraft = order.status === ORDER_STATUSES.DRAFT;

    const updated = await applyOrderStatusTransition(
      prisma,
      order,
      nextStatus,
      auth.sub,
      params.notes ?? `Statut logistique défini sur ${params.status}`,
      { manual: true }
    );

    if (wasDraft && nextStatus === ORDER_STATUSES.VALIDATED) {
      publishOrderEvent(ctx.service!, DomainEvents.order.validated, {
        orderId: updated.id,
        orderNumber: updated.orderNumber,
        status: updated.status
      });
    }

    if (nextStatus === ORDER_STATUSES.SHIPPED) {
      publishOrderEvent(ctx.service!, "order.order.shipped", {
        orderId: updated.id,
        orderNumber: updated.orderNumber,
        siteCode: updated.siteCode
      });
    } else if (nextStatus === ORDER_STATUSES.DELIVERED) {
      publishOrderEvent(ctx.service!, "order.order.delivered", {
        orderId: updated.id,
        orderNumber: updated.orderNumber,
        siteCode: updated.siteCode
      });
    }

    await logOrderAudit({
      action: "order.order.setLogisticsStatus",
      actorId: auth.sub,
      actorEmail: auth.email,
      roles: auth.roles,
      entity: "CustomerOrder",
      entityId: updated.id,
      siteCode: updated.siteCode,
      correlationId: ctx.meta.correlationId,
      metadata: { orderNumber: updated.orderNumber, uiStatus: params.status },
      diff: {
        before: { status: order.status },
        after: { status: updated.status }
      }
    });

    return toOrderSummary(updated);
  }
};
