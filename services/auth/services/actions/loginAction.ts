import bcrypt from "bcryptjs";
import { z } from "zod";

import { Context } from "moleculer";


import { loginSchema } from "../../src/lib/schemas.js";
import { createError, parseOrThrow } from "../../src/lib/errors.js";
import { userInclude, buildAccessTokenPayload } from "../../src/lib/user-mapper.js";
import { mapUser, mapRoles, type UserWithRoles } from "../../src/lib/user-mapper.js";
import { signAccessToken } from "../../src/lib/jwt.js";
import { createRefreshTokenRecord } from "../../src/lib/tokens.js";
import { prisma } from "../../src/db.js";


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

type LoginParams = z.infer<typeof loginSchema>;
type AuthContextMeta = {
  correlationId: string;
};

export const loginAction = {
  async handler(ctx: Context<LoginParams, AuthContextMeta>) {
    let params;
    try {
      params = loginSchema.parse(ctx.params);
    } catch (error) {
      parseOrThrow(error);
    }

    const user = await prisma.user.findFirst({
      where: { email: params.email.toLowerCase() },
      include: userInclude,
    });

    if (!user || !(await bcrypt.compare(params.password, user.passwordHash))) {
      throw createError("INVALID_CREDENTIALS");
    }

    if (!user.isActive) {
      throw createError("USER_INACTIVE");
    }

    ctx.service!.logger.info("User logged in", {
      correlationId: ctx.meta.correlationId,
      userId: user.id,
      email: user.email,
    });

    return issueTokens(user);
  },
};
