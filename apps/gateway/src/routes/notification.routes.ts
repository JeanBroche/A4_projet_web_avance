import type { RouteAliasMap, RouteDefinition } from "./types.js";
import { toAliases } from "./auth.routes.js";

export const restNotificationRoutes: RouteDefinition[] = [
  { method: "GET", path: "notifications", action: "notification.inbox.list", layer: "REST" },
  { method: "PATCH", path: "notifications/:id/read", action: "notification.inbox.markRead", layer: "REST" },
  { method: "GET", path: "notifications/unread-count", action: "notification.inbox.unreadCount", layer: "REST" }
];

export const restNotificationAliases: RouteAliasMap = toAliases(restNotificationRoutes);
