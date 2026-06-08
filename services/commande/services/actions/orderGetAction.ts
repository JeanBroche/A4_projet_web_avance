import { z } from 'zod';
import { prisma } from '../../src/db.js';

import { Context } from 'moleculer';

import { resolveSiteCode, requireAuth } from '@aeronexis/services-shared';
import { orderByIdSchema } from '../../src/lib/schemas.js';
import { createError, parseParams } from '@aeronexis/services-shared';
import {
  assertSiteAccess,
  toOrderSummary,
  loadActiveOrder,
} from '../../src/lib/order-helpers.js';


type OrderGetParams = z.infer<typeof orderByIdSchema>;
type AuthContextMeta = {
  correlationId: string;
};

export const orderGetAction = {
  async handler(ctx: Context<OrderGetParams, AuthContextMeta>) {
    const params = parseParams(orderByIdSchema, ctx.params);
    const auth = requireAuth(ctx, params.accessToken);

    const order = await loadActiveOrder(prisma, params.orderId);
    assertSiteAccess(auth.siteId, order.siteCode);

    const siteCode = resolveSiteCode(params);
    if (siteCode && order.siteCode !== siteCode) {
      throw createError('NOT_FOUND', `Order not found: ${params.orderId}`);
    }

    return toOrderSummary(order);
  },
};
