import { z } from 'zod';
import { prisma } from '../../src/db.js';

import { Context } from 'moleculer';

import { assertSiteAccess, parseParams, requireCommercial } from '@aeronexis/services-shared';
import { orderValidateSchema } from '../../src/lib/schemas.js';
import {
  toOrderSummary,
  loadActiveOrder,
  ORDER_STATUSES,
  VALIDATION_ACTIONS,
  assertStatusTransition,
} from '../../src/lib/order-helpers.js';

import { publishOrderEvent } from '../../src/lib/events.js';

type OrderValidateParams = z.infer<typeof orderValidateSchema>;
type AuthContextMeta = {
  correlationId: string;
};

export const orderValidateAction = {
  async handler(ctx: Context<OrderValidateParams, AuthContextMeta>) {
    const params = parseParams(orderValidateSchema, ctx.params);
    const auth = requireCommercial(ctx, params.accessToken);

    const order = await loadActiveOrder(prisma, params.orderId);
    assertSiteAccess(auth, order.siteCode);
    assertStatusTransition(order.status, ORDER_STATUSES.VALIDATED);

    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.customerOrder.update({
        where: { id: order.id },
        data: { status: ORDER_STATUSES.VALIDATED },
        include: {
          client: true,
          lines: { where: { deletedAt: null }, orderBy: { lineNumber: 'asc' } },
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: ORDER_STATUSES.VALIDATED,
          changedBy: auth.sub,
          notes: params.notes,
        },
      });

      await tx.orderValidation.create({
        data: {
          orderId: order.id,
          action: VALIDATION_ACTIONS.VALIDATE,
          validatedBy: auth.sub,
          reason: params.notes,
        },
      });

      return next;
    });

    publishOrderEvent(ctx.service!, 'order.validated', {
      orderId: updated.id,
      orderNumber: updated.orderNumber,
      status: updated.status,
    });

    ctx.service!.logger.info('Order validated', {
      correlationId: ctx.meta.correlationId,
      orderId: updated.id,
      orderNumber: updated.orderNumber,
    });

    return toOrderSummary(updated);
  },
};
