import { z } from 'zod';
import { prisma } from '../../src/db.js';

import { Context } from 'moleculer';

import { parseParams, requireOrderRead, resolveEffectiveSite } from '@aeronexis/services-shared';
import { orderListUrgentSchema } from '../../src/lib/schemas.js';
import {
  toOrderSummary,
  ORDER_STATUSES,
} from '../../src/lib/order-helpers.js';


type OrderListUrgentParams = z.infer<typeof orderListUrgentSchema>;
type AuthContextMeta = {
  correlationId: string;
};

export const orderListUrgentAction = {
  async handler(ctx: Context<OrderListUrgentParams, AuthContextMeta>) {
    const params = parseParams(orderListUrgentSchema, ctx.params);
    const auth = requireOrderRead(ctx, params.accessToken);

    const effectiveSite = resolveEffectiveSite(auth, params);

    const orders = await prisma.customerOrder.findMany({
      where: {
        deletedAt: null,
        isUrgent: true,
        status: {
          notIn: [ORDER_STATUSES.REJECTED, ORDER_STATUSES.DELIVERED],
        },
        ...(effectiveSite ? { siteCode: effectiveSite } : {}),
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
      include: {
        client: true,
        lines: { where: { deletedAt: null }, orderBy: { lineNumber: 'asc' } },
      },
    });

    return orders.map(toOrderSummary);
  },
};
