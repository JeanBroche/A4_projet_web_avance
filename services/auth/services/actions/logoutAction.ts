import { z } from 'zod';

import { Context } from 'moleculer';

import { logoutSchema } from '../../src/lib/schemas.js';
import { parseOrThrow } from '../../src/lib/errors.js';
import { revokeRefreshToken } from '../../src/lib/tokens.js';
import { prisma } from '../../src/db.js';

type LogoutParams = z.infer<typeof logoutSchema>;
type AuthContextMeta = {
  correlationId: string;
};

export const logoutAction = {
  async handler(ctx: Context<LogoutParams, AuthContextMeta>) {
    let params;
    try {
      params = logoutSchema.parse(ctx.params);
    } catch (error) {
      parseOrThrow(error);
    }

    await revokeRefreshToken(prisma, params.refreshToken);

    ctx.service!.logger.info('User logged out', {
      correlationId: ctx.meta.correlationId,
    });

    return { success: true };
  },
};
