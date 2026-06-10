import { z } from 'zod';

import { Context } from 'moleculer';

import { parseParams } from "@aeronexis/services-shared";
import { logAuthAudit } from "../../src/lib/audit.js";
import { logoutSchema } from '../../src/lib/schemas.js';
import { revokeRefreshToken } from '../../src/lib/tokens.js';
import { prisma } from '../../src/db.js';

type LogoutParams = z.infer<typeof logoutSchema>;
type AuthContextMeta = {
  correlationId: string;
};

export const logoutAction = {
  async handler(ctx: Context<LogoutParams, AuthContextMeta>) {
    const params = parseParams(logoutSchema, ctx.params);

    await revokeRefreshToken(prisma, params.refreshToken);

    await logAuthAudit({
      action: "auth.logout",
      correlationId: ctx.meta.correlationId
    });

    ctx.service!.logger.info('User logged out', {
      correlationId: ctx.meta.correlationId,
    });

    return { success: true };
  },
};
