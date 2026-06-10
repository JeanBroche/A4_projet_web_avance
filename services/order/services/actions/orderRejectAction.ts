import { z } from 'zod';
import { prisma } from '../../src/db.js';

import { Context } from 'moleculer';

import { assertSiteAccess, parseParams, requireCommercial } from '@aeronexis/services-shared';
import { orderRejectSchema } from '../../src/lib/schemas.js';
import {
  toOrderSummary,
  loadActiveOrder,
  ORDER_STATUSES,
  VALIDATION_ACTIONS,
  assertStatusTransition,
} from '../../src/lib/order-helpers.js';
import { logOrderAudit } from '../../src/lib/audit.js';
import { publishOrderEvent } from '../../src/lib/events.js';

type OrderRejectParams = z.infer<typeof orderRejectSchema>;
type AuthContextMeta = {
  correlationId: string;
};

export const orderRejectAction = {
  async handler(ctx: Context<OrderRejectParams, AuthContextMeta>) {
    const params = parseParams(orderRejectSchema, ctx.params);
    const auth = requireCommercial(ctx, params.accessToken);

    const order = await loadActiveOrder(prisma, params.orderId);
    assertSiteAccess(auth, order.siteCode);
    assertStatusTransition(order.status, ORDER_STATUSES.REJECTED);

    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.customerOrder.update({
        where: { id: order.id },
        data: { status: ORDER_STATUSES.REJECTED },
        include: {
          client: true,
          lines: { where: { deletedAt: null }, orderBy: { lineNumber: 'asc' } },
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: ORDER_STATUSES.REJECTED,
          changedBy: auth.sub,
          notes: params.reason,
        },
      });

      await tx.orderValidation.create({
        data: {
          orderId: order.id,
          action: VALIDATION_ACTIONS.REJECT,
          validatedBy: auth.sub,
          reason: params.reason,
        },
      });

      return next;
    });

    publishOrderEvent(ctx.service!, 'order.rejected', {
      orderId: updated.id,
      orderNumber: updated.orderNumber,
      siteCode: updated.siteCode,
      reason: params.reason,
    });

    await logOrderAudit({
      action: 'order.order.reject',
      actorId: auth.sub,
      actorEmail: auth.email,
      roles: auth.roles,
      entity: 'CustomerOrder',
      entityId: updated.id,
      siteCode: updated.siteCode,
      correlationId: ctx.meta.correlationId,
      metadata: { orderNumber: updated.orderNumber, reason: params.reason },
      diff: {
        before: { status: order.status },
        after: { status: updated.status }
      }
    });

    return toOrderSummary(updated);
  },
};
