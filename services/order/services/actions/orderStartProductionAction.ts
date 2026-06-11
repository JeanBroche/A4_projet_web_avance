import { z } from "zod";
import { Errors, Context } from "moleculer";
import { prisma } from "../../src/db.js";
import {
  assertSiteAccess,
  parseParams,
  requireAnyRole
} from "@aeronexis/services-shared";
import { orderStartProductionSchema } from "../../src/lib/schemas.js";
import {
  applyOrderStatusTransition,
  loadActiveOrder,
  ORDER_STATUSES,
  toOrderSummary
} from "../../src/lib/order-helpers.js";
import { DomainEvents } from "@aeronexis/shared";
import { publishOrderEvent } from "../../src/lib/events.js";
import { logOrderAudit } from "../../src/lib/audit.js";

type OrderStartProductionParams = z.infer<typeof orderStartProductionSchema>;
type AuthContextMeta = { correlationId: string };

type BatchCreated = {
  batch_id: string;
  batch_code: string;
  command_id: string;
};

export const orderStartProductionAction = {
  async handler(ctx: Context<OrderStartProductionParams, AuthContextMeta>) {
    const params = parseParams(orderStartProductionSchema, ctx.params);
    const auth = await requireAnyRole(ctx, params.accessToken, ["commercial", "operateur"]);

    const order = await loadActiveOrder(prisma, params.orderId);
    assertSiteAccess(auth, order.siteCode);

    let batchCode: string | undefined;

    if (params.bom_code) {
      try {
        const batch = await ctx.call<BatchCreated, Record<string, unknown>>(
          "production.batch.create",
          {
            accessToken: params.accessToken,
            bom_code: params.bom_code,
            command_id: order.orderNumber,
            plannedStartAt: params.plannedStartAt,
            plannedEndAt: params.plannedEndAt
          }
        );
        batchCode = batch.batch_code;

        await prisma.customerOrderLine.updateMany({
          where: { orderId: order.id, deletedAt: null },
          data: { ofId: batch.batch_code }
        });
      } catch (error) {
        const code =
          error instanceof Errors.MoleculerClientError ? error.code : undefined;
        if (code !== 404 && code !== 501) {
          throw error;
        }
        ctx.service!.logger.warn("production.batch.create unavailable", {
          orderNumber: order.orderNumber,
          bom_code: params.bom_code
        });
      }
    }

    const reloaded = batchCode
      ? await loadActiveOrder(prisma, order.id)
      : order;

    const updated = await applyOrderStatusTransition(
      prisma,
      reloaded,
      ORDER_STATUSES.IN_PRODUCTION,
      auth.sub,
      params.notes ?? "Production started"
    );

    publishOrderEvent(ctx.service!, DomainEvents.order.startProduction, {
      orderId: updated.id,
      orderNumber: updated.orderNumber,
      siteCode: updated.siteCode,
      batchCode: batchCode ?? null
    });

    await logOrderAudit({
      action: "order.order.startProduction",
      actorId: auth.sub,
      actorEmail: auth.email,
      roles: auth.roles,
      entity: "CustomerOrder",
      entityId: updated.id,
      siteCode: updated.siteCode,
      correlationId: ctx.meta.correlationId,
      metadata: { orderNumber: updated.orderNumber, batchCode },
      diff: {
        before: { status: order.status },
        after: { status: updated.status }
      }
    });

    return toOrderSummary(updated);
  }
};
