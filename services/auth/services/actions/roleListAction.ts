import { z } from 'zod';

import { Context } from 'moleculer';

import { parseParams, requireAdmin } from "@aeronexis/services-shared";
import { accessTokenSchema } from '../../src/lib/schemas.js';
import { prisma } from '../../src/db.js';

type RoleListParams = z.infer<typeof accessTokenSchema>;
type AuthContextMeta = {
  correlationId: string;
};

export const roleListAction = {
  async handler(ctx: Context<RoleListParams, AuthContextMeta>) {
    const params = parseParams(accessTokenSchema, ctx.params);

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
