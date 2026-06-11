import type { RouteAliasMap, RouteDefinition } from "./types.js";
import { toAliases } from "./auth.routes.js";

export const restStockRoutes: RouteDefinition[] = [
  { method: "GET", path: "stock/levels", action: "stock.level.list", layer: "REST" },
  { method: "GET", path: "stock/levels/consolidated", action: "stock.level.consolidate", layer: "REST" },
  { method: "POST", path: "stock/movements", action: "stock.movement.create", layer: "REST" },
  { method: "GET", path: "stock/movements", action: "stock.movement.list", layer: "REST" },
  { method: "POST", path: "stock/reservations", action: "stock.reservation.create", layer: "REST" },
  { method: "POST", path: "stock/reservations/:id/release", action: "stock.reservation.release", layer: "REST" },
  { method: "POST", path: "stock/reservations/:id/cancel", action: "stock.reservation.cancel", layer: "REST" },
  { method: "GET", path: "stock/alerts", action: "stock.alert.list", layer: "REST" },
  { method: "PUT", path: "stock/thresholds", action: "stock.threshold.upsert", layer: "REST" },
  { method: "GET", path: "stock/forecast/rupture", action: "stock.forecast.rupture", layer: "REST" },
  { method: "GET", path: "stock/supplier-delays", action: "stock.supplier.delay.list", layer: "REST" },
  { method: "POST", path: "stock/supplier-delays", action: "stock.supplier.delay.notify", layer: "REST" },
  { method: "GET", path: "stock/materials", action: "stock.material.list", layer: "REST" },
  { method: "GET", path: "stock/materials/:materialId", action: "stock.material.get", layer: "REST" },
  { method: "PUT", path: "stock/materials", action: "stock.material.upsert", layer: "REST" }
];

export const restStockAliases: RouteAliasMap = toAliases(restStockRoutes);
