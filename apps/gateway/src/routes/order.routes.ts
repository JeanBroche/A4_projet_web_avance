import type { RouteAliasMap, RouteDefinition } from "./types.js";
import { toAliases } from "./auth.routes.js";

export const restOrderRoutes: RouteDefinition[] = [
  { method: "POST", path: "commercial/orders", action: "order.order.create", layer: "REST" },
  { method: "GET", path: "commercial/orders/urgent", action: "order.order.listUrgent", layer: "REST" },
  { method: "GET", path: "commercial/orders/history", action: "order.order.history", layer: "REST" },
  { method: "GET", path: "commercial/orders/:orderId", action: "order.order.get", layer: "REST" },
  { method: "GET", path: "commercial/orders/:orderId/status", action: "order.order.status", layer: "REST" },
  { method: "PATCH", path: "commercial/orders/:orderId/priority", action: "order.order.setPriority", layer: "REST" },
  { method: "GET", path: "commercial/orders/:orderId/delay-risk", action: "order.order.delayRisk", layer: "REST" },
  { method: "POST", path: "commercial/orders/:orderId/validate", action: "order.order.validate", layer: "REST" },
  { method: "POST", path: "commercial/orders/:orderId/reject", action: "order.order.reject", layer: "REST" },
  { method: "POST", path: "commercial/orders/:orderId/start-production", action: "order.order.startProduction", layer: "REST" },
  { method: "POST", path: "commercial/orders/:orderId/finish", action: "order.order.finish", layer: "REST" },
  { method: "POST", path: "commercial/orders/:orderId/mark-shipped", action: "order.order.markShipped", layer: "REST" },
  { method: "POST", path: "commercial/orders/:orderId/mark-delivered", action: "order.order.markDelivered", layer: "REST" },
  { method: "PATCH", path: "commercial/orders/:orderId/logistics-status", action: "order.order.setLogisticsStatus", layer: "REST" },
  { method: "PATCH", path: "commercial/orders/:orderId", action: "order.order.update", layer: "REST" },
  { method: "DELETE", path: "commercial/orders/:orderId", action: "order.order.delete", layer: "REST" },
  { method: "GET", path: "commercial/clients", action: "order.client.list", layer: "REST" },
  { method: "GET", path: "commercial/clients/:clientId", action: "order.client.get", layer: "REST" },
  { method: "PUT", path: "commercial/clients", action: "order.client.upsert", layer: "REST" },
  { method: "GET", path: "commercial/clients/:clientId/stats", action: "order.client.stats", layer: "REST" },
  { method: "GET", path: "commercial/clients/:clientId/orders/history", action: "order.order.history", layer: "REST" }
];

export const restOrderAliases: RouteAliasMap = toAliases(restOrderRoutes);
