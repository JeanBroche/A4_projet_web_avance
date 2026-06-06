import { createError } from "./errors.mjs";
import { verifyAccessToken } from "./jwt.mjs";

/**
 * @param {string | undefined | null} accessToken
 * @param {import("moleculer").Context} ctx
 */
export function resolveAccessToken(accessToken, ctx) {
  if (accessToken) {
    return accessToken;
  }

  const metaToken =
    ctx.meta?.authorization ||
    ctx.meta?.accessToken ||
    ctx.meta?.token;

  if (typeof metaToken === "string" && metaToken.length > 0) {
    if (metaToken.startsWith("Bearer ")) {
      return metaToken.slice(7);
    }
    return metaToken;
  }

  return null;
}

/**
 * @param {import("moleculer").Context} ctx
 * @param {string | undefined | null} accessToken
 */
export function requireAuth(ctx, accessToken) {
  const token = resolveAccessToken(accessToken, ctx);

  if (!token) {
    throw createError("TOKEN_INVALID");
  }

  return verifyAccessToken(token);
}

/**
 * @param {import("moleculer").Context} ctx
 * @param {string | undefined | null} accessToken
 * @param {string} roleCode
 */
export function requireRole(ctx, accessToken, roleCode) {
  const payload = requireAuth(ctx, accessToken);

  if (!payload.roles?.includes(roleCode)) {
    throw createError("FORBIDDEN");
  }

  return payload;
}

/**
 * @param {import("moleculer").Context} ctx
 * @param {string | undefined | null} accessToken
 */
export function requireAdmin(ctx, accessToken) {
  return requireRole(ctx, accessToken, "admin");
}
