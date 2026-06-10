import { z } from 'zod';
import { prisma } from '../../src/db.js';

import { Context } from 'moleculer';

import { assertSiteAccess, parseParams, requireAuth } from '@aeronexis/services-shared';
import { orderDelayRiskSchema } from '../../src/lib/schemas.js';
import { loadActiveOrder, computeDelayRisk } from '../../src/lib/order-helpers.js';

type OrderDelayRiskParams = z.infer<typeof orderDelayRiskSchema>;
type AuthContextMeta = {
  correlationId: string;
};

export const orderDelayRiskAction = {
  async handler(ctx: Context<OrderDelayRiskParams, AuthContextMeta>) {
    const params = parseParams(orderDelayRiskSchema, ctx.params);
    const auth = requireAuth(ctx, params.accessToken);

    const order = await loadActiveOrder(prisma, params.orderId);
    assertSiteAccess(auth, order.siteCode);

    const risk = computeDelayRisk(order);

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      isUrgent: order.isUrgent,
      ...risk,
    };
  },
};
