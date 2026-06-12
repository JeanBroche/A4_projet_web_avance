import { z } from "zod";
import { Context } from "moleculer";
import { prisma } from "../../src/db.js";
import {
  assertSiteAccess,
  createError,
  parseParams,
  requireCommercial
} from "@aeronexis/services-shared";
import { orderDeleteSchema } from "../../src/lib/schemas.js";
import { loadActiveOrder, ORDER_STATUSES } from "../../src/lib/order-helpers.js";
import { logOrderAudit } from "../../src/lib/audit.js";

type OrderDeleteParams = z.infer<typeof orderDeleteSchema>;
type AuthContextMeta = { correlationId: string };

const NON_DELETABLE_STATUSES = new Set<string>([
  ORDER_STATUSES.IN_PRODUCTION,
  ORDER_STATUSES.SHIPPED,
  ORDER_STATUSES.DELIVERED
]);

export const orderDeleteAction = {
  async handler(ctx: Context<OrderDeleteParams, AuthContextMeta>) {
    const params = parseParams(orderDeleteSchema, ctx.params);
    const auth = await requireCommercial(ctx, params.accessToken);

    const order = await loadActiveOrder(prisma, params.orderId);
    assertSiteAccess(auth, order.siteCode);

    if (NON_DELETABLE_STATUSES.has(order.status)) {
      throw createError(
        "ORDER_NOT_DELETABLE",
        `Order ${order.orderNumber} cannot be deleted in status ${order.status}`
      );
    }

    const deletedAt = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.customerOrderLine.updateMany({
        where: { orderId: order.id, deletedAt: null },
        data: { deletedAt }
      });
      await tx.customerOrder.update({
        where: { id: order.id },
        data: { deletedAt }
      });
    });

    await logOrderAudit({
      action: "order.order.delete",
      actorId: auth.sub,
      actorEmail: auth.email,
      roles: auth.roles,
      entity: "CustomerOrder",
      entityId: order.id,
      siteCode: order.siteCode,
      correlationId: ctx.meta.correlationId,
      metadata: { orderNumber: order.orderNumber },
      diff: {
        before: { deletedAt: null, status: order.status },
        after: { deletedAt: deletedAt.toISOString(), status: order.status }
      }
    });

    return { id: order.id, orderNumber: order.orderNumber, deleted: true };
  }
};
