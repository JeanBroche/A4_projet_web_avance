import { z } from 'zod';

import { Context } from 'moleculer';

import { requireAdmin } from '../../src/lib/rbac.js';
import { accessTokenSchema } from '../../src/lib/schemas.js';
import { parseOrThrow } from '../../src/lib/errors.js';
import { prisma } from '../../src/db.js';

type RoleListParams = z.infer<typeof accessTokenSchema>;
type AuthContextMeta = {
  correlationId: string;
};

export const roleListAction = {
  async handler(ctx: Context<RoleListParams, AuthContextMeta>) {
    let params;
    try {
      params = accessTokenSchema.parse(ctx.params);
    } catch (error) {
      parseOrThrow(error);
    }

    requireAdmin(ctx, params.accessToken);

    const roles = await prisma.role.findMany({
      orderBy: { code: 'asc' },
    });

    return {
      roles: roles.map((role) => ({
        id: role.id,
        code: role.code,
        label: role.label,
      })),
    };
  },
};
