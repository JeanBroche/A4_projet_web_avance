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
 * Require any of the listed roles. Admin always passes.
 *
 * @param {import("moleculer").Context} ctx
 * @param {string | undefined | null} accessToken
 * @param {string[]} roleCodes
 */
export function requireAnyRole(ctx, accessToken, roleCodes) {
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

/**
 * @param {import("moleculer").Context} ctx
 * @param {string | undefined | null} accessToken
 */
export function requireLogistique(ctx, accessToken) {
  return requireAnyRole(ctx, accessToken, ["logistique"]);
}
