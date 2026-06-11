import { z } from 'zod';
import { prisma } from '../../src/db.js';

import { Context } from 'moleculer';

import {
  parseParams,
  requireAuth,
  resolveEffectiveSite,
  createError,
} from '@aeronexis/services-shared';
import { orderByIdSchema } from '../../src/lib/schemas.js';
import {
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
    const auth = await requireAuth(ctx, params.accessToken);

    const effectiveSite = resolveEffectiveSite(auth, params);
    const order = await loadActiveOrder(prisma, params.orderId);
    if (effectiveSite && order.siteCode !== effectiveSite) {
      throw createError("NOT_FOUND", `Order not found: ${params.orderId}`);
    }

    return toOrderSummary(order);
  }
};
