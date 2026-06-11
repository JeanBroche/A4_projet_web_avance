import { createError } from "./errorUtils.js";
import type { AccessTokenPayload } from "./jwtUtils.js";
import { resolveSiteCode } from "./paramsUtils.js";

export function assertSiteAccess(
  auth: Pick<AccessTokenPayload, "siteId" | "roles">,
  resourceSiteCode: string
) {
  if (auth.roles?.includes("admin")) {
    return;
  }

  if (!auth.siteId) {
    throw createError("FORBIDDEN", "User has no site assignment");
  }

  if (auth.siteId !== resourceSiteCode) {
    throw createError("FORBIDDEN", "Resource belongs to a different site");
  }
}

export function resolveEffectiveSite(
  auth: Pick<AccessTokenPayload, "siteId" | "roles">,
  params: { siteCode?: string; siteId?: string }
): string | null {
  const requestedSite = resolveSiteCode(params);

  if (auth.roles?.includes("admin")) {
    return requestedSite || auth.siteId || null;
  }

  if (auth.siteId && requestedSite && auth.siteId !== requestedSite) {
    throw createError("FORBIDDEN", "Requested site does not match user site");
  }

  return auth.siteId || requestedSite || null;
}
