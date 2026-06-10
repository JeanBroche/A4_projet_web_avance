import { z } from 'zod';
import { prisma } from '../../src/db.js';

import { Context } from 'moleculer';

import { assertSiteAccess, parseParams, requireAuth } from '@aeronexis/services-shared';
import { clientStatsSchema } from '../../src/lib/schemas.js';
import { loadActiveClient, computeClientStats } from '../../src/lib/order-helpers.js';

type ClientStatsParams = z.infer<typeof clientStatsSchema>;
type AuthContextMeta = {
  correlationId: string;
};

export const clientStatsAction = {
  async handler(ctx: Context<ClientStatsParams, AuthContextMeta>) {
    const params = parseParams(clientStatsSchema, ctx.params);
    const auth = requireAuth(ctx, params.accessToken);

    const client = await loadActiveClient(prisma, params.clientId);
    assertSiteAccess(auth, client.siteCode);

    const orders = await prisma.customerOrder.findMany({
      where: {
        clientId: client.id,
        deletedAt: null,
      },
    });

    return {
      clientId: client.id,
      clientCode: client.code,
      clientName: client.name,
      siteCode: client.siteCode,
      stats: computeClientStats(orders),
    };
  },
};
