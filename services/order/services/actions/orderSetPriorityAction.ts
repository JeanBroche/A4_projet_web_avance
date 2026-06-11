import { z } from 'zod';
import { prisma } from '../../src/db.js';

import { Context } from 'moleculer';

import { assertSiteAccess, createError, parseParams, requireCommercial } from '@aeronexis/services-shared';
import { orderSetPrioritySchema } from '../../src/lib/schemas.js';
import {
  toOrderSummary,
  loadActiveOrder,
  ORDER_STATUSES
} from '../../src/lib/order-helpers.js';

import { publishOrderEvent } from '../../src/lib/events.js';
import { DomainEvents } from '@aeronexis/shared';
import { logOrderAudit } from '../../src/lib/audit.js';

type OrderSetPriorityParams = z.infer<typeof orderSetPrioritySchema>;
type AuthContextMeta = {
  correlationId: string;
};

export const orderSetPriorityAction = {
  async handler(ctx: Context<OrderSetPriorityParams, AuthContextMeta>) {
    const params = parseParams(orderSetPrioritySchema, ctx.params);
    const auth = await requireCommercial(ctx, params.accessToken);

    const order = await loadActiveOrder(prisma, params.orderId);
    assertSiteAccess(auth, order.siteCode);

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

    publishOrderEvent(ctx.service!, DomainEvents.order.priorityChanged, {
      orderId: updated.id,
      orderNumber: updated.orderNumber,
      isUrgent: updated.isUrgent,
      dueDate: updated.dueDate,
    });

    await logOrderAudit({
      action: 'order.order.setPriority',
      actorId: auth.sub,
      actorEmail: auth.email,
      roles: auth.roles,
      entity: 'CustomerOrder',
      entityId: updated.id,
      siteCode: updated.siteCode,
      correlationId: ctx.meta.correlationId,
      metadata: { orderNumber: updated.orderNumber },
      diff: {
        before: { isUrgent: order.isUrgent, dueDate: order.dueDate },
        after: { isUrgent: updated.isUrgent, dueDate: updated.dueDate }
      }
    });

    return toOrderSummary(updated);
  },
};
