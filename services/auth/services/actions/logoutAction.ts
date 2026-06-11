import { z } from 'zod';

import { Context } from 'moleculer';

import { parseParams } from "@aeronexis/services-shared";
import { logAuthAudit } from "../../src/lib/audit.js";
import { logoutSchema } from '../../src/lib/schemas.js';
import { revokeRefreshToken, revokeAccessToken } from '../../src/lib/tokens.js';
import { prisma } from '../../src/db.js';

type LogoutParams = z.infer<typeof logoutSchema>;
type AuthContextMeta = {
  correlationId: string;
  accessToken?: string;
  authorization?: string;
};

function resolveLogoutAccessToken(
  params: LogoutParams,
  meta: AuthContextMeta
): string | undefined {
  if (params.accessToken) {
    return params.accessToken;
  }
  if (typeof meta.accessToken === "string") {
    return meta.accessToken;
  }
  const authorization = meta.authorization;
  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice(7);
  }
  return undefined;
}

export const logoutAction = {
  async handler(ctx: Context<LogoutParams, AuthContextMeta>) {
    const params = parseParams(logoutSchema, ctx.params);

    await revokeRefreshToken(prisma, params.refreshToken);

    const accessToken = resolveLogoutAccessToken(params, ctx.meta);
    if (accessToken) {
      await revokeAccessToken(accessToken);
    }

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
