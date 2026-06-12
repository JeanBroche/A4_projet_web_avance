import type { RouteAliasMap, RouteDefinition } from "./types.js";
import { toAliases } from "./auth.routes.js";

export const restShipmentRoutes: RouteDefinition[] = [
  { method: "POST", path: "logistics/picklists", action: "shipment.picklist.create", layer: "REST" },
  { method: "POST", path: "logistics/picklists/:id/complete", action: "shipment.picklist.complete", layer: "REST" },
  { method: "POST", path: "logistics/shipments/plan", action: "shipment.shipment.plan", layer: "REST" },
  { method: "GET", path: "logistics/shipments", action: "shipment.shipment.history", layer: "REST" },
  { method: "GET", path: "logistics/shipments/:id", action: "shipment.shipment.get", layer: "REST" },
  { method: "GET", path: "logistics/shipments/:id/track", action: "shipment.shipment.track", layer: "REST" },
  { method: "PATCH", path: "logistics/shipments/:id", action: "shipment.shipment.update", layer: "REST" },
  { method: "PATCH", path: "logistics/shipments/:id/status", action: "shipment.shipment.updateStatus", layer: "REST" }
];

export const restShipmentAliases: RouteAliasMap = toAliases(restShipmentRoutes);
