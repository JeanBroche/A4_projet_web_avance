import type { RouteAliasMap, RouteDefinition } from "./types.js";
import { toAliases } from "./auth.routes.js";

export const restAuditRoutes: RouteDefinition[] = [
  { method: "GET", path: "audit/changes", action: "audit.change.list", layer: "REST" },
  { method: "POST", path: "audit/events", action: "audit.event.record", layer: "REST" },
  { method: "GET", path: "audit/events/critical", action: "audit.event.listCritical", layer: "REST" },
  { method: "GET", path: "audit/lots/:lotNumber/trace", action: "audit.lot.trace", layer: "REST" },
  { method: "GET", path: "audit/lots/:lotNumber/export", action: "audit.lot.export", layer: "REST" },
  { method: "POST", path: "audit/documents", action: "audit.document.upload", layer: "REST" },
  { method: "GET", path: "audit/documents", action: "audit.document.list", layer: "REST" },
  { method: "GET", path: "audit/documents/:id/url", action: "audit.document.url", layer: "REST" }
];

export const restAuditAliases: RouteAliasMap = toAliases(restAuditRoutes);
