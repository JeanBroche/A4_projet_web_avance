type GatewayRequest = {
  url?: string;
  originalUrl?: string;
  $url?: string;
};

/** Routes auth accessibles sans JWT valide (login + refresh avec cookie refresh). */
const PUBLIC_AUTH_PATHS = new Set([
  "/api/auth/login",
  "/api/auth/refresh"
]);

export function requestPath(req: GatewayRequest): string {
  const raw = req.url ?? req.originalUrl ?? req.$url ?? "";
  const path = raw.split("?")[0] ?? "";
  if (path.startsWith("/api/")) return path;
  if (path.startsWith("/auth/")) return `/api${path}`;
  return path;
}

export function isPublicAuthRoute(req: GatewayRequest): boolean {
  return PUBLIC_AUTH_PATHS.has(requestPath(req));
}
