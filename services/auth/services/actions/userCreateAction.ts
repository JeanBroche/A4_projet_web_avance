import { z } from 'zod';
import bcrypt from 'bcryptjs';

import { Context } from 'moleculer';

import { createError } from '../../src/lib/errors.js';
import { requireAdmin } from '../../src/lib/rbac.js';
import { userCreateSchema } from '../../src/lib/schemas.js';
import { parseOrThrow } from '../../src/lib/errors.js';
import { mapUser, mapRoles, userInclude } from '../../src/lib/user-mapper.js';
import { prisma } from '../../src/db.js';

type UserCreateParams = z.infer<typeof userCreateSchema>;
type AuthContextMeta = {
  correlationId: string;
};

export const userCreateAction = {
  async handler(ctx: Context<UserCreateParams, AuthContextMeta>) {
    let params;
    try {
      params = userCreateSchema.parse(ctx.params);
    } catch (error) {
      parseOrThrow(error);
    }

    requireAdmin(ctx, params.accessToken);

    const email = params.email.toLowerCase();
    const existing = await prisma.user.findFirst({ where: { email } });

    if (existing) {
      throw createError('CONFLICT', 'Email already in use');
    }

    const roles = await prisma.role.findMany({
      where: {
        code: { in: params.roleCodes },
        deletedAt: null,
      },
    });

    if (roles.length !== params.roleCodes.length) {
      throw createError(
        'VALIDATION_ERROR',
        'One or more role codes are invalid'
      );
    }

    const passwordHash = await bcrypt.hash(params.password, 10);

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          passwordHash,
          firstName: params.firstName,
          lastName: params.lastName,
          siteId: params.siteId ?? null,
          isActive: true,
        },
      });

      await tx.userRole.createMany({
        data: roles.map((role) => ({
          userId: created.id,
          roleId: role.id,
        })),
      });

      return tx.user.findUniqueOrThrow({
        where: { id: created.id },
        include: userInclude,
      });
    });

    ctx.service!.logger.info('User created', {
      correlationId: ctx.meta.correlationId,
      userId: user.id,
      email: user.email,
    });

    return {
      user: mapUser(user),
      roles: mapRoles(user),
    };
  },
};
