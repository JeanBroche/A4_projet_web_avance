"use strict";

const bcrypt = require("bcryptjs");

/** @type {import("../src/generated/prisma/client.js").PrismaClient | null} */
let prisma = null;

/** @type {Record<string, Function> | null} */
let lib = null;

async function loadLib() {
  if (lib) {
    return lib;
  }

  const [
    jwtMod,
    tokensMod,
    errorsMod,
    schemasMod,
    rbacMod,
    userMapperMod,
    dbMod
  ] = await Promise.all([
    import("../src/lib/jwt.mjs"),
    import("../src/lib/tokens.mjs"),
    import("../src/lib/errors.mjs"),
    import("../src/lib/schemas.mjs"),
    import("../src/lib/rbac.mjs"),
    import("../src/lib/user-mapper.mjs"),
    import("../src/db.mjs")
  ]);

  prisma = dbMod.prisma;
  lib = {
    ...jwtMod,
    ...tokensMod,
    ...errorsMod,
    ...schemasMod,
    ...rbacMod,
    ...userMapperMod
  };

  return lib;
}

async function getCtx() {
  const loaded = await loadLib();
  return { prisma, lib: loaded };
}

async function findUserById(id) {
  const { prisma: db, lib: l } = await getCtx();
  const user = await db.user.findFirst({
    where: { id },
    include: l.userInclude
  });

  if (!user) {
    throw l.createError("NOT_FOUND", "User not found");
  }

  if (!user.isActive) {
    throw l.createError("USER_INACTIVE");
  }

  return user;
}

async function issueTokens(user) {
  const { lib: l } = await getCtx();
  const accessToken = l.signAccessToken(l.buildAccessTokenPayload(user));
  const refreshToken = await l.createRefreshTokenRecord(prisma, user.id);
  const roles = l.mapRoles(user);

  return {
    user: l.mapUser(user),
    roles,
    accessToken,
    refreshToken
  };
}

module.exports = {
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
        const { prisma: db, lib: l } = await getCtx();

        let params;
        try {
          params = l.loginSchema.parse(ctx.params);
        } catch (error) {
          l.parseOrThrow(error);
        }

        const user = await db.user.findFirst({
          where: { email: params.email.toLowerCase() },
          include: l.userInclude
        });

        if (!user || !(await bcrypt.compare(params.password, user.passwordHash))) {
          throw l.createError("INVALID_CREDENTIALS");
        }

        if (!user.isActive) {
          throw l.createError("USER_INACTIVE");
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
        const { lib: l } = await getCtx();

        let params;
        try {
          params = l.refreshSchema.parse(ctx.params);
        } catch (error) {
          l.parseOrThrow(error);
        }

        const { user, refreshToken } = await l.rotateRefreshToken(
          prisma,
          params.refreshToken
        );
        const accessToken = l.signAccessToken(l.buildAccessTokenPayload(user));

        this.logger.info("Token refreshed", {
          correlationId: ctx.meta.correlationId,
          userId: user.id
        });

        return {
          user: l.mapUser(user),
          roles: l.mapRoles(user),
          accessToken,
          refreshToken
        };
      }
    },

    logout: {
      async handler(ctx) {
        const { lib: l } = await getCtx();

        let params;
        try {
          params = l.logoutSchema.parse(ctx.params);
        } catch (error) {
          l.parseOrThrow(error);
        }

        await l.revokeRefreshToken(prisma, params.refreshToken);

        this.logger.info("User logged out", {
          correlationId: ctx.meta.correlationId
        });

        return { success: true };
      }
    },

    me: {
      async handler(ctx) {
        const { lib: l } = await getCtx();

        let params;
        try {
          params = l.meSchema.parse(ctx.params);
        } catch (error) {
          l.parseOrThrow(error);
        }

        const payload = l.requireAuth(ctx, params.accessToken);
        const user = await findUserById(payload.sub);

        return {
          user: l.mapUser(user),
          roles: l.mapRoles(user)
        };
      }
    },

    "user.list": {
      async handler(ctx) {
        const { prisma: db, lib: l } = await getCtx();

        let params;
        try {
          params = l.userListSchema.parse(ctx.params);
        } catch (error) {
          l.parseOrThrow(error);
        }

        l.requireAdmin(ctx, params.accessToken);

        const users = await db.user.findMany({
          where: {
            ...(params.email ? { email: params.email.toLowerCase() } : {}),
            ...(params.isActive !== undefined ? { isActive: params.isActive } : {})
          },
          include: l.userInclude,
          orderBy: { email: "asc" }
        });

        return {
          users: users.map((user) => l.mapUser(user))
        };
      }
    },

    "user.create": {
      async handler(ctx) {
        const { prisma: db, lib: l } = await getCtx();

        let params;
        try {
          params = l.userCreateSchema.parse(ctx.params);
        } catch (error) {
          l.parseOrThrow(error);
        }

        l.requireAdmin(ctx, params.accessToken);

        const email = params.email.toLowerCase();
        const existing = await db.user.findFirst({ where: { email } });

        if (existing) {
          throw l.createError("CONFLICT", "Email already in use");
        }

        const roles = await db.role.findMany({
          where: {
            code: { in: params.roleCodes },
            deletedAt: null
          }
        });

        if (roles.length !== params.roleCodes.length) {
          throw l.createError("VALIDATION_ERROR", "One or more role codes are invalid");
        }

        const passwordHash = await bcrypt.hash(params.password, 10);

        const user = await db.$transaction(async (tx) => {
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
            include: l.userInclude
          });
        });

        this.logger.info("User created", {
          correlationId: ctx.meta.correlationId,
          userId: user.id,
          email: user.email
        });

        return {
          user: l.mapUser(user),
          roles: l.mapRoles(user)
        };
      }
    },

    "user.update": {
      async handler(ctx) {
        const { prisma: db, lib: l } = await getCtx();

        let params;
        try {
          params = l.userUpdateSchema.parse(ctx.params);
        } catch (error) {
          l.parseOrThrow(error);
        }

        l.requireAdmin(ctx, params.accessToken);

        const existing = await db.user.findFirst({
          where: { id: params.id },
          include: l.userInclude
        });

        if (!existing) {
          throw l.createError("NOT_FOUND", "User not found");
        }

        if (params.email) {
          const email = params.email.toLowerCase();
          const conflict = await db.user.findFirst({
            where: {
              email,
              NOT: { id: params.id }
            }
          });

          if (conflict) {
            throw l.createError("CONFLICT", "Email already in use");
          }
        }

        let roleRecords = null;
        if (params.roleCodes) {
          roleRecords = await db.role.findMany({
            where: {
              code: { in: params.roleCodes },
              deletedAt: null
            }
          });

          if (roleRecords.length !== params.roleCodes.length) {
            throw l.createError("VALIDATION_ERROR", "One or more role codes are invalid");
          }
        }

        const user = await db.$transaction(async (tx) => {
          const data = {};

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
            include: l.userInclude
          });
        });

        this.logger.info("User updated", {
          correlationId: ctx.meta.correlationId,
          userId: user.id
        });

        return {
          user: l.mapUser(user),
          roles: l.mapRoles(user)
        };
      }
    },

    "role.list": {
      async handler(ctx) {
        const { prisma: db, lib: l } = await getCtx();

        let params;
        try {
          params = l.accessTokenSchema.parse(ctx.params);
        } catch (error) {
          l.parseOrThrow(error);
        }

        l.requireAdmin(ctx, params.accessToken);

        const roles = await db.role.findMany({
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
