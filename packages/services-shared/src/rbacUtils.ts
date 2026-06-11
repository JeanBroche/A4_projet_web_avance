import type { Context } from "moleculer";
import { createError } from "./errorUtils.js";
import { verifyAccessTokenWithBlacklist, type AccessTokenPayload } from "./jwtUtils.js";

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

export async function requireAuth(
  ctx: Context,
  accessToken?: string | null
): Promise<AccessTokenPayload> {
  const token = resolveAccessToken(accessToken ?? null, ctx);

  if (!token) {
    throw createError("TOKEN_INVALID");
  }

  return verifyAccessTokenWithBlacklist(token);
}

export async function requireAnyRole(
  ctx: Context,
  accessToken: string | undefined | null,
  roleCodes: string[]
): Promise<AccessTokenPayload> {
  const payload = await requireAuth(ctx, accessToken);
  const roles = payload.roles || [];

  if (roles.includes("admin")) {
    return payload;
  }

  if (!roleCodes.some((code) => roles.includes(code))) {
    throw createError("FORBIDDEN");
  }

  return payload;
}

export async function requireCommercial(
  ctx: Context,
  accessToken?: string | null
): Promise<AccessTokenPayload> {
  return requireAnyRole(ctx, accessToken ?? null, ["commercial"]);
}

export async function requireRole(
  ctx: Context,
  accessToken: string | undefined | null,
  roleCode: string
) {
  const payload = await requireAuth(ctx, accessToken);

  if (!payload.roles?.includes(roleCode)) {
    throw createError("FORBIDDEN");
  }

  return payload;
}

export async function requireAdmin(ctx: Context, accessToken: string | undefined | null) {
  return requireRole(ctx, accessToken, "admin");
}

export async function requireProduction(
  ctx: Context,
  accessToken?: string | null
): Promise<AccessTokenPayload> {
  return requireAnyRole(ctx, accessToken ?? null, ["operateur"]);
}

export async function requireDirection(
  ctx: Context,
  accessToken?: string | null
): Promise<AccessTokenPayload> {
  return requireAnyRole(ctx, accessToken ?? null, ["direction"]);
}

export async function requireLogistique(
  ctx: Context,
  accessToken?: string | null
): Promise<AccessTokenPayload> {
  return requireAnyRole(ctx, accessToken ?? null, ["logistique"]);
}

export async function requireStockRead(
  ctx: Context,
  accessToken?: string | null
): Promise<AccessTokenPayload> {
  return requireAnyRole(ctx, accessToken ?? null, ["logistique", "direction"]);
}

export async function requireOrderRead(
  ctx: Context,
  accessToken?: string | null
): Promise<AccessTokenPayload> {
  return requireAnyRole(ctx, accessToken ?? null, ["commercial", "direction"]);
}

export async function requireCommercialStats(
  ctx: Context,
  accessToken?: string | null
): Promise<AccessTokenPayload> {
  return requireAnyRole(ctx, accessToken ?? null, ["commercial", "direction"]);
}

export async function requireProductionRead(
  ctx: Context,
  accessToken?: string | null
): Promise<AccessTokenPayload> {
  return requireAnyRole(ctx, accessToken ?? null, ["operateur", "direction"]);
}
