import type { RouteAliasMap, RouteDefinition } from "./types.js";

export const restAuthPublicRoutes: RouteDefinition[] = [
  { method: "POST", path: "auth/refresh", action: "auth.refresh", layer: "REST" },
  { method: "POST", path: "auth/logout", action: "auth.logout", layer: "REST" }
];

export const restAuthRoutes: RouteDefinition[] = [
  { method: "GET", path: "auth/me", action: "auth.me", layer: "REST" },
  { method: "GET", path: "auth/users", action: "auth.user.list", layer: "REST" },
  { method: "POST", path: "auth/users", action: "auth.user.create", layer: "REST" },
  { method: "PATCH", path: "auth/users/:userId", action: "auth.user.update", layer: "REST" },
  { method: "GET", path: "auth/roles", action: "auth.role.list", layer: "REST" }
];

export function toAliases(routes: RouteDefinition[]): RouteAliasMap {
  return Object.fromEntries(routes.map((r) => [`${r.method} ${r.path}`, r.action]));
}

export const restAuthAliases = toAliases(restAuthRoutes);
