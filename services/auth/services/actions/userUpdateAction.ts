import { z } from 'zod';
import bcrypt from 'bcryptjs';

import { Context } from 'moleculer';

import { createError, parseOrThrow, requireAdmin } from "@aeronexis/services-shared";
import { userUpdateSchema } from '../../src/lib/schemas.js';
import { mapUser, mapRoles, userInclude } from '../../src/lib/user-mapper.js';
import { prisma } from '../../src/db.js';

type UserUpdateParams = z.infer<typeof userUpdateSchema>;
type AuthContextMeta = {
  correlationId: string;
};

export const userUpdateAction = {
  async handler(ctx: Context<UserUpdateParams, AuthContextMeta>) {
    let params;
    try {
      params = userUpdateSchema.parse(ctx.params);
    } catch (error) {
      parseOrThrow(error);
    }

    requireAdmin(ctx, params.accessToken);

    const existing = await prisma.user.findFirst({
      where: { id: params.id },
      include: userInclude,
    });

    if (!existing) {
      throw createError('NOT_FOUND', 'User not found');
    }

    if (params.email) {
      const email = params.email.toLowerCase();
      const conflict = await prisma.user.findFirst({
        where: {
          email,
          NOT: { id: params.id },
        },
      });

      if (conflict) {
        throw createError('CONFLICT', 'Email already in use');
      }
    }

    let roleRecords: Awaited<ReturnType<typeof prisma.role.findMany>> | null =
      null;
    if (params.roleCodes) {
      roleRecords = await prisma.role.findMany({
        where: {
          code: { in: params.roleCodes },
          deletedAt: null,
        },
      });

      if (roleRecords.length !== params.roleCodes.length) {
        throw createError(
          'VALIDATION_ERROR',
          'One or more role codes are invalid'
        );
      }
    }

    const user = await prisma.$transaction(async (tx) => {
      const data: {
        email?: string;
        firstName?: string;
        lastName?: string;
        siteId?: string | null;
        isActive?: boolean;
        passwordHash?: string;
      } = {};

      if (params.email) {
        data.email = params.email.toLowerCase();
      }
      if (params.firstName) {
        data.firstName = params.firstName;
      }
      if (params.lastName) {
        data.lastName = params.lastName;
      }
      if (params.siteId !== undefined) {
        data.siteId = params.siteId;
      }
      if (params.isActive !== undefined) {
        data.isActive = params.isActive;
      }
      if (params.password) {
        data.passwordHash = await bcrypt.hash(params.password, 10);
      }

      if (Object.keys(data).length > 0) {
        await tx.user.update({
          where: { id: params.id },
          data,
        });
      }

      if (roleRecords) {
        await tx.userRole.deleteMany({ where: { userId: params.id } });
        await tx.userRole.createMany({
          data: roleRecords.map((role) => ({
            userId: params.id,
            roleId: role.id,
          })),
        });
      }

      return tx.user.findUniqueOrThrow({
        where: { id: params.id },
        include: userInclude,
      });
    });

    ctx.service!.logger.info('User updated', {
      correlationId: ctx.meta.correlationId,
      userId: user.id,
    });

    return {
      user: mapUser(user),
      roles: mapRoles(user),
    };
  },
};
