import { z } from 'zod';

import { Context } from 'moleculer';

import { parseParams, requireAdmin } from "@aeronexis/services-shared";
import { userListSchema } from '../../src/lib/schemas.js';
import {
  mapUser,
  userInclude,
} from '../../src/lib/user-mapper.js';
import { prisma } from '../../src/db.js';

type UserListParams = z.infer<typeof userListSchema>;
type AuthContextMeta = {
  correlationId: string;
};

export const userListAction = {
  async handler(ctx: Context<UserListParams, AuthContextMeta>) {
    const params = parseParams(userListSchema, ctx.params);

    await requireAdmin(ctx, params.accessToken);

    const users = await prisma.user.findMany({
      where: {
        ...(params.email ? { email: params.email.toLowerCase() } : {}),
        ...(params.isActive !== undefined ? { isActive: params.isActive } : {}),
      },
      include: userInclude,
      orderBy: { email: 'asc' },
    });

    return {
      users: users.map((user) => mapUser(user)),
    };
  },
};
