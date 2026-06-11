type IncomingRequest = {
  headers?: Record<string, string | string[] | undefined>;
};

export const ACCESS_TOKEN_COOKIE = "aeronexis_access_token";
export const REFRESH_TOKEN_COOKIE = "aeronexis_refresh_token";

const ACCESS_PATH = "/";
const REFRESH_PATH = "/api/auth";

function parseTtlSeconds(value: string, fallbackSeconds: number): number {
  const match = /^(\d+)([smhd])$/i.exec(value.trim());
  if (!match) return fallbackSeconds;
  const amount = Number(match[1]);
  const unit = match[2]!.toLowerCase();
  switch (unit) {
    case "s":
      return amount;
    case "m":
      return amount * 60;
    case "h":
      return amount * 3600;
    case "d":
      return amount * 86400;
    default:
      return fallbackSeconds;
  }
}

function cookieSecure(): boolean {
  const raw = process.env.COOKIE_SECURE;
  if (raw === "true") return true;
  if (raw === "false") return false;
  return process.env.NODE_ENV === "production";
}

function cookieSameSite(): "Lax" | "Strict" | "None" {
  const raw = (process.env.COOKIE_SAMESITE ?? "lax").toLowerCase();
  if (raw === "strict") return "Strict";
  if (raw === "none") return "None";
  return "Lax";
}

function accessMaxAgeSeconds(): number {
  return parseTtlSeconds(process.env.JWT_ACCESS_TTL ?? "15m", 15 * 60);
}

function refreshMaxAgeSeconds(): number {
  return parseTtlSeconds(process.env.JWT_REFRESH_TTL ?? "7d", 7 * 86400);
}

function headerValue(
  headers: Record<string, string | string[] | undefined> | undefined,
  name: string
): string | undefined {
  const raw = headers?.[name] ?? headers?.[name.toLowerCase()];
  if (Array.isArray(raw)) return raw[0];
  return raw;
}

export function parseCookies(req: IncomingRequest): Record<string, string> {
  const header = headerValue(req.headers, "cookie");
  if (!header) return {};

  const cookies: Record<string, string> = {};
  for (const part of header.split(";")) {
    const [rawName, ...rest] = part.trim().split("=");
    if (!rawName) continue;
    const value = rest.join("=");
    cookies[rawName] = decodeURIComponent(value);
  }
  return cookies;
}

export function getAccessTokenFromRequest(req: IncomingRequest): string | undefined {
  return parseCookies(req)[ACCESS_TOKEN_COOKIE];
}

export function getRefreshTokenFromRequest(req: IncomingRequest): string | undefined {
  return parseCookies(req)[REFRESH_TOKEN_COOKIE];
}

export function serializeCookie(
  name: string,
  value: string,
  options: {
    maxAge?: number;
    path?: string;
    clear?: boolean;
  } = {}
): string {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push(`Path=${options.path ?? ACCESS_PATH}`);
  parts.push("HttpOnly");

  const sameSite = cookieSameSite();
  parts.push(`SameSite=${sameSite}`);

  if (cookieSecure() || sameSite === "None") {
    parts.push("Secure");
  }

  if (options.clear) {
    parts.push("Max-Age=0");
  } else if (options.maxAge != null) {
    parts.push(`Max-Age=${options.maxAge}`);
  }

  return parts.join("; ");
}

export function buildAuthCookieHeaders(accessToken: string, refreshToken: string): string[] {
  return [
    serializeCookie(ACCESS_TOKEN_COOKIE, accessToken, {
      maxAge: accessMaxAgeSeconds(),
      path: ACCESS_PATH
    }),
    serializeCookie(REFRESH_TOKEN_COOKIE, refreshToken, {
      maxAge: refreshMaxAgeSeconds(),
      path: REFRESH_PATH
    })
  ];
}

export function buildClearAuthCookieHeaders(): string[] {
  return [
    serializeCookie(ACCESS_TOKEN_COOKIE, "", { path: ACCESS_PATH, clear: true }),
    serializeCookie(REFRESH_TOKEN_COOKIE, "", { path: REFRESH_PATH, clear: true })
  ];
}

export function setAuthResponseCookies(
  meta: Record<string, unknown>,
  accessToken: string,
  refreshToken: string
): void {
  meta.$responseHeaders = {
    "Set-Cookie": buildAuthCookieHeaders(accessToken, refreshToken)
  };
}

export function clearAuthResponseCookies(meta: Record<string, unknown>): void {
  meta.$responseHeaders = {
    "Set-Cookie": buildClearAuthCookieHeaders()
  };
}
