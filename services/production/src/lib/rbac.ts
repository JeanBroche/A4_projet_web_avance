import type { Context } from "moleculer";
import { createError } from "./errors.js";
import { verifyAccessToken, type AccessTokenPayload } from "./jwt.js";

export function resolveAccessToken(accessToken: string | undefined | null, ctx: Context) {
  if (accessToken) {
    return accessToken;
  }
  const meta = ctx.meta as {
    authorization?: string;
    accessToken?: string;
    token?: string;
  };
  const metaToken =
    meta.authorization ||
    meta.accessToken ||
    meta.token;
  if (typeof metaToken === "string" && metaToken.length > 0) {
    if (metaToken.startsWith("Bearer ")) {
      return metaToken.slice(7);
    }
    return metaToken;
  }
  return null;
}

export function requireAuth(ctx: Context, accessToken?: string | null): AccessTokenPayload {
  const token = resolveAccessToken(accessToken ?? null, ctx);
  if (!token) {
    throw createError("TOKEN_INVALID");
  }
  return verifyAccessToken(token);
}

export function requireAnyRole(
  ctx: Context,
  accessToken: string | undefined | null,
  roleCodes: string[]
): AccessTokenPayload {
  const payload = requireAuth(ctx, accessToken);
  const roles = payload.roles || [];
  if (roles.includes("admin")) {
    return payload;
  }
  if (!roleCodes.some((code) => roles.includes(code))) {
    throw createError("FORBIDDEN");
  }
  return payload;
}

export function requireProduction(ctx: Context, accessToken?: string | null): AccessTokenPayload {
  return requireAnyRole(ctx, accessToken ?? null, ["operateur"]);
}