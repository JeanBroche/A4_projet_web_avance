import { z } from 'zod';

import { Context } from 'moleculer';

import { parseOrThrow, signAccessToken } from '@aeronexis/services-shared';
import { refreshSchema } from '../../src/lib/schemas.js';
import { buildAccessTokenPayload } from '../../src/lib/user-mapper.js';
import { mapUser, mapRoles } from '../../src/lib/user-mapper.js';
import { rotateRefreshToken } from '../../src/lib/tokens.js';
import { prisma } from '../../src/db.js';

type RefreshParams = z.infer<typeof refreshSchema>;
type AuthContextMeta = {
  correlationId: string;
};

export const refreshAction = {
  async handler(ctx: Context<RefreshParams, AuthContextMeta>) {
    let params;
    try {
      params = refreshSchema.parse(ctx.params);
    } catch (error) {
      parseOrThrow(error);
    }

    const { user, refreshToken } = await rotateRefreshToken(
      prisma,
      params.refreshToken
    );
    const accessToken = signAccessToken(buildAccessTokenPayload(user));

    ctx.service!.logger.info('Token refreshed', {
      correlationId: ctx.meta.correlationId,
      userId: user.id,
    });

    return {
      user: mapUser(user),
      roles: mapRoles(user),
      accessToken,
      refreshToken,
    };
  },
};
