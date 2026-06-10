import { z } from 'zod';
import { prisma } from '../../src/db.js';

import { Context } from 'moleculer';

import { resolveSiteCode, createError, requireCommandeRead } from '@aeronexis/services-shared';
import { orderHistorySchema } from '../../src/lib/schemas.js';
import { parseParams } from '@aeronexis/services-shared';
import {
  loadActiveClient,
  toOrderSummary,
  assertSiteAccess,
} from '../../src/lib/order-helpers.js';

type OrderHistoryParams = z.infer<typeof orderHistorySchema>;
type AuthContextMeta = {
  correlationId: string;
};

export const orderHistoryAction = {
  async handler(ctx: Context<OrderHistoryParams, AuthContextMeta>) {
    const params = parseParams(orderHistorySchema, ctx.params);
    const auth = requireCommandeRead(ctx, params.accessToken);

    const siteCode = resolveSiteCode(params);
    if (auth.siteId && siteCode && auth.siteId !== siteCode) {
      throw createError('FORBIDDEN');
    }

    const effectiveSite = auth.siteId || siteCode;

    if (params.clientId) {
      const client = await loadActiveClient(prisma, params.clientId);
      assertSiteAccess(auth.siteId, client.siteCode);
    }

    const where = {
      deletedAt: null,
      ...(params.clientId ? { clientId: params.clientId } : {}),
      ...(effectiveSite ? { siteCode: effectiveSite } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.customerOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: params.limit ?? 50,
        skip: params.offset ?? 0,
        include: {
          client: true,
          lines: { where: { deletedAt: null }, orderBy: { lineNumber: 'asc' } },
        },
      }),
      prisma.customerOrder.count({ where }),
    ]);

    return {
      total,
      limit: params.limit ?? 50,
      offset: params.offset ?? 0,
      items: items.map(toOrderSummary),
    };
  },
};
