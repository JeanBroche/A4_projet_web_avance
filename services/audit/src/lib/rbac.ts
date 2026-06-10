import type { Context } from "moleculer";
import { createError } from "./errors.js";
import { verifyAccessToken } from "./jwt.js";

export function resolveAccessToken(accessToken: string | undefined | null, ctx: Context) {
  if (accessToken) {
    return accessToken;
  }

  const meta = ctx.meta as {
    authorization?: string;
    accessToken?: string;
    token?: string;
  };

  const metaToken = meta.authorization || meta.accessToken || meta.token;

  if (typeof metaToken === "string" && metaToken.length > 0) {
    if (metaToken.startsWith("Bearer ")) {
      return metaToken.slice(7);
    }
    return metaToken;
  }

  return null;
}

export function requireAuth(ctx: Context, accessToken: string | undefined | null) {
  const token = resolveAccessToken(accessToken, ctx);

  if (!token) {
    throw createError("TOKEN_INVALID");
  }

  return verifyAccessToken(token);
}

export function requireRole(ctx: Context, accessToken: string | undefined | null, roleCode: string) {
  const payload = requireAuth(ctx, accessToken);

  if (!payload.roles?.includes(roleCode)) {
    throw createError("FORBIDDEN");
  }

  return payload;
}

export function requireAdmin(ctx: Context, accessToken: string | undefined | null) {
  return requireRole(ctx, accessToken, "admin");
}
