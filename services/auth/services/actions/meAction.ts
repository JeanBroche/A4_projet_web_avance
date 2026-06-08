import { z } from 'zod';

import { Context } from 'moleculer';

import { createError, parseOrThrow, requireAuth } from "@aeronexis/services-shared";
import { meSchema } from '../../src/lib/schemas.js';
import { mapUser, mapRoles, userInclude, type UserWithRoles } from '../../src/lib/user-mapper.js';
import { prisma } from '../../src/db.js';

async function findUserById(id: string): Promise<UserWithRoles> {
  const user = await prisma.user.findFirst({
    where: { id },
    include: userInclude,
  });

  if (!user) {
    throw createError('NOT_FOUND', 'User not found');
  }

  if (!user.isActive) {
    throw createError('USER_INACTIVE');
  }

  return user;
}

type MeParams = z.infer<typeof meSchema>;
type AuthContextMeta = {
  correlationId: string;
};

export const meAction = {
  async handler(ctx: Context<MeParams, AuthContextMeta>) {
    let params;
    try {
      params = meSchema.parse(ctx.params);
    } catch (error) {
      parseOrThrow(error);
    }

    const payload = requireAuth(ctx, params.accessToken);
    const user = await findUserById(payload.sub);

    return {
      user: mapUser(user),
      roles: mapRoles(user),
    };
  },
};
