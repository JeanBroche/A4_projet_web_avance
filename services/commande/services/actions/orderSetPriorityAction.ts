import { z } from 'zod';
import { prisma } from '../../src/db.js';

import { Context } from 'moleculer';

import { createError, parseParams, requireCommercial } from '@aeronexis/services-shared';
import { orderSetPrioritySchema } from '../../src/lib/schemas.js';
import {
  toOrderSummary,
  loadActiveOrder,
  ORDER_STATUSES
} from '../../src/lib/order-helpers.js';

import { publishCommandeEvent } from '../../src/lib/events.js';

type OrderSetPriorityParams = z.infer<typeof orderSetPrioritySchema>;
type AuthContextMeta = {
  correlationId: string;
};

export const orderSetPriorityAction = {
  async handler(ctx: Context<OrderSetPriorityParams, AuthContextMeta>) {
    const params = parseParams(orderSetPrioritySchema, ctx.params);
    requireCommercial(ctx, params.accessToken);

    const order = await loadActiveOrder(prisma, params.orderId);

    if (order.status === ORDER_STATUSES.REJECTED) {
      throw createError('ORDER_NOT_EDITABLE');
    }

    const updated = await prisma.customerOrder.update({
      where: { id: order.id },
      data: {
        isUrgent: params.isUrgent,
        dueDate: params.isUrgent ? (params.dueDate ?? order.dueDate) : null,
      },
      include: {
        client: true,
        lines: { where: { deletedAt: null }, orderBy: { lineNumber: 'asc' } },
      },
    });

    publishCommandeEvent(ctx.service!, 'order.priority.changed', {
      orderId: updated.id,
      orderNumber: updated.orderNumber,
      isUrgent: updated.isUrgent,
      dueDate: updated.dueDate,
    });

    return toOrderSummary(updated);
  },
};
