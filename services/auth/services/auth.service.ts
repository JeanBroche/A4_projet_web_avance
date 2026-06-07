import bcrypt from "bcryptjs";
import type { ServiceSchema } from "moleculer";
import { prisma } from "../src/db.js";
import { createError, parseOrThrow } from "../src/lib/errors.js";
import { signAccessToken } from "../src/lib/jwt.js";
import { requireAdmin, requireAuth } from "../src/lib/rbac.js";
import {
  accessTokenSchema,
  loginSchema,
  logoutSchema,
  meSchema,
  refreshSchema,
  userCreateSchema,
  userListSchema,
  userUpdateSchema
} from "../src/lib/schemas.js";
import {
  buildAccessTokenPayload,
  mapRoles,
  mapUser,
  userInclude,
  type UserWithRoles
} from "../src/lib/user-mapper.js";
import {
  createRefreshTokenRecord,
  revokeRefreshToken,
  rotateRefreshToken
} from "../src/lib/tokens.js";

async function findUserById(id: string): Promise<UserWithRoles> {
  const user = await prisma.user.findFirst({
    where: { id },
    include: userInclude
  });

  if (!user) {
    throw createError("NOT_FOUND", "User not found");
  }

  if (!user.isActive) {
    throw createError("USER_INACTIVE");
  }

  return user;
}

async function issueTokens(user: UserWithRoles) {
  const accessToken = signAccessToken(buildAccessTokenPayload(user));
  const refreshToken = await createRefreshTokenRecord(prisma, user.id);
  const roles = mapRoles(user);

  return {
    user: mapUser(user),
    roles,
    accessToken,
    refreshToken
  };
}

const AuthService: ServiceSchema = {
  name: "auth",

  actions: {
    ping: {
      handler(ctx) {
        this.logger.info("Ping", {
          correlationId: ctx.meta.correlationId
        });

        return "pong";
      }
    },

    login: {
      async handler(ctx) {
        let params;
        try {
          params = loginSchema.parse(ctx.params);
        } catch (error) {
          parseOrThrow(error);
        }

        const user = await prisma.user.findFirst({
          where: { email: params.email.toLowerCase() },
          include: userInclude
        });

        if (!user || !(await bcrypt.compare(params.password, user.passwordHash))) {
          throw createError("INVALID_CREDENTIALS");
        }

        if (!user.isActive) {
          throw createError("USER_INACTIVE");
        }

        this.logger.info("User logged in", {
          correlationId: ctx.meta.correlationId,
          userId: user.id,
          email: user.email
        });

        return issueTokens(user);
      }
    },

    refresh: {
      async handler(ctx) {
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

        this.logger.info("Token refreshed", {
          correlationId: ctx.meta.correlationId,
          userId: user.id
        });

        return {
          user: mapUser(user),
          roles: mapRoles(user),
          accessToken,
          refreshToken
        };
      }
    },

    logout: {
      async handler(ctx) {
        let params;
        try {
          params = logoutSchema.parse(ctx.params);
        } catch (error) {
          parseOrThrow(error);
        }

        await revokeRefreshToken(prisma, params.refreshToken);

        this.logger.info("User logged out", {
          correlationId: ctx.meta.correlationId
        });

        return { success: true };
      }
    },

    me: {
      async handler(ctx) {
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
          roles: mapRoles(user)
        };
      }
    },

    "user.list": {
      async handler(ctx) {
        let params;
        try {
          params = userListSchema.parse(ctx.params);
        } catch (error) {
          parseOrThrow(error);
        }

        requireAdmin(ctx, params.accessToken);

        const users = await prisma.user.findMany({
          where: {
            ...(params.email ? { email: params.email.toLowerCase() } : {}),
            ...(params.isActive !== undefined ? { isActive: params.isActive } : {})
          },
          include: userInclude,
          orderBy: { email: "asc" }
        });

        return {
          users: users.map((user) => mapUser(user))
        };
      }
    },

    "user.create": {
      async handler(ctx) {
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
          throw createError("CONFLICT", "Email already in use");
        }

        const roles = await prisma.role.findMany({
          where: {
            code: { in: params.roleCodes },
            deletedAt: null
          }
        });

        if (roles.length !== params.roleCodes.length) {
          throw createError("VALIDATION_ERROR", "One or more role codes are invalid");
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
              isActive: true
            }
          });

          await tx.userRole.createMany({
            data: roles.map((role) => ({
              userId: created.id,
              roleId: role.id
            }))
          });

          return tx.user.findUniqueOrThrow({
            where: { id: created.id },
            include: userInclude
          });
        });

        this.logger.info("User created", {
          correlationId: ctx.meta.correlationId,
          userId: user.id,
          email: user.email
        });

        return {
          user: mapUser(user),
          roles: mapRoles(user)
        };
      }
    },

    "user.update": {
      async handler(ctx) {
        let params;
        try {
          params = userUpdateSchema.parse(ctx.params);
        } catch (error) {
          parseOrThrow(error);
        }

        requireAdmin(ctx, params.accessToken);

        const existing = await prisma.user.findFirst({
          where: { id: params.id },
          include: userInclude
        });

        if (!existing) {
          throw createError("NOT_FOUND", "User not found");
        }

        if (params.email) {
          const email = params.email.toLowerCase();
          const conflict = await prisma.user.findFirst({
            where: {
              email,
              NOT: { id: params.id }
            }
          });

          if (conflict) {
            throw createError("CONFLICT", "Email already in use");
          }
        }

        let roleRecords: Awaited<ReturnType<typeof prisma.role.findMany>> | null = null;
        if (params.roleCodes) {
          roleRecords = await prisma.role.findMany({
            where: {
              code: { in: params.roleCodes },
              deletedAt: null
            }
          });

          if (roleRecords.length !== params.roleCodes.length) {
            throw createError("VALIDATION_ERROR", "One or more role codes are invalid");
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
              data
            });
          }

          if (roleRecords) {
            await tx.userRole.deleteMany({ where: { userId: params.id } });
            await tx.userRole.createMany({
              data: roleRecords.map((role) => ({
                userId: params.id,
                roleId: role.id
              }))
            });
          }

          return tx.user.findUniqueOrThrow({
            where: { id: params.id },
            include: userInclude
          });
        });

        this.logger.info("User updated", {
          correlationId: ctx.meta.correlationId,
          userId: user.id
        });

        return {
          user: mapUser(user),
          roles: mapRoles(user)
        };
      }
    },

    "role.list": {
      async handler(ctx) {
        let params;
        try {
          params = accessTokenSchema.parse(ctx.params);
        } catch (error) {
          parseOrThrow(error);
        }

        requireAdmin(ctx, params.accessToken);

        const roles = await prisma.role.findMany({
          orderBy: { code: "asc" }
        });

        return {
          roles: roles.map((role) => ({
            id: role.id,
            code: role.code,
            label: role.label
          }))
        };
      }
    }
  }
};

export default AuthService;
