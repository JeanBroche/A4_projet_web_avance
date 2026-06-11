import type { RouteDefinition } from "./types.js";
import { restAuthPublicRoutes, restAuthRoutes } from "./auth.routes.js";
import { restStockRoutes } from "./stock.routes.js";
import { restOrderRoutes } from "./order.routes.js";
import { restProductionRoutes } from "./production.routes.js";
import { restShipmentRoutes } from "./shipment.routes.js";
import { restReportingRoutes } from "./reporting.routes.js";
import { restAuditRoutes } from "./audit.routes.js";
import { restNotificationRoutes } from "./notification.routes.js";
import { restAuthAliases } from "./auth.routes.js";
import { restStockAliases } from "./stock.routes.js";
import { restOrderAliases } from "./order.routes.js";
import { restProductionAliases } from "./production.routes.js";
import { restShipmentAliases } from "./shipment.routes.js";
import { restReportingAliases } from "./reporting.routes.js";
import { restAuditAliases } from "./audit.routes.js";
import { restNotificationAliases } from "./notification.routes.js";

export const publicApiAliases = {
  "POST auth/login": "auth.login",
  "POST auth/refresh": "auth.refresh",
  "POST auth/logout": "auth.logout"
} as const;

export const protectedApiAliases = {
  ...restAuthAliases,
  ...restStockAliases,
  ...restOrderAliases,
  ...restProductionAliases,
  ...restShipmentAliases,
  ...restReportingAliases,
  ...restAuditAliases,
  ...restNotificationAliases
} as const;

export const allRouteDefinitions: RouteDefinition[] = [
  { method: "POST", path: "auth/login", action: "auth.login", layer: "REST" },
  ...restAuthPublicRoutes,
  ...restAuthRoutes,
  ...restStockRoutes,
  ...restOrderRoutes,
  ...restProductionRoutes,
  ...restShipmentRoutes,
  ...restReportingRoutes,
  ...restAuditRoutes,
  ...restNotificationRoutes
];

export * from "./types.js";
