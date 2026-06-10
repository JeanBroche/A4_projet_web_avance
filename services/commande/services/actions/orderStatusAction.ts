import { z } from 'zod';
import { prisma } from '../../src/db.js';

import { Context } from 'moleculer';

import { assertSiteAccess, parseParams, requireAuth } from '@aeronexis/services-shared';
import { orderByIdSchema } from '../../src/lib/schemas.js';
import { loadActiveOrder } from '../../src/lib/order-helpers.js';

type OrderStatusParams = z.infer<typeof orderByIdSchema>;
type AuthContextMeta = {
  correlationId: string;
};

export const orderStatusAction = {
  async handler(ctx: Context<OrderStatusParams, AuthContextMeta>) {
    const params = parseParams(orderByIdSchema, ctx.params);
    const auth = requireAuth(ctx, params.accessToken);

    const order = await loadActiveOrder(prisma, params.orderId);
    assertSiteAccess(auth, order.siteCode);

    const history = await prisma.orderStatusHistory.findMany({
      where: { orderId: order.id },
      orderBy: { createdAt: 'asc' },
    });

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      currentStatus: order.status,
      history: history.map((entry) => ({
        id: entry.id,
        fromStatus: entry.fromStatus,
        toStatus: entry.toStatus,
        changedBy: entry.changedBy,
        notes: entry.notes,
        createdAt: entry.createdAt,
      })),
    };
  },
};
