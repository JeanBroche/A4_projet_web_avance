import type { RouteAliasMap, RouteDefinition } from "./types.js";
import { toAliases } from "./auth.routes.js";

export const restStockRoutes: RouteDefinition[] = [
  { method: "GET", path: "stock/levels", action: "stock.level.list", layer: "REST" },
  { method: "GET", path: "stock/levels/consolidated", action: "stock.level.consolidate", layer: "REST" },
  { method: "POST", path: "stock/movements", action: "stock.movement.create", layer: "REST" },
  { method: "GET", path: "stock/movements", action: "stock.movement.list", layer: "REST" },
  { method: "POST", path: "stock/reservations", action: "stock.reservation.create", layer: "REST" },
  { method: "GET", path: "stock/reservations", action: "stock.reservation.list", layer: "REST" },
  { method: "POST", path: "stock/reservations/:id/release", action: "stock.reservation.release", layer: "REST" },
  { method: "POST", path: "stock/reservations/:id/cancel", action: "stock.reservation.cancel", layer: "REST" },
  { method: "PATCH", path: "stock/reservations/:id", action: "stock.reservation.update", layer: "REST" },
  { method: "GET", path: "stock/alerts", action: "stock.alert.list", layer: "REST" },
  { method: "PUT", path: "stock/thresholds", action: "stock.threshold.upsert", layer: "REST" },
  { method: "GET", path: "stock/forecast/rupture", action: "stock.forecast.rupture", layer: "REST" },
  { method: "GET", path: "stock/supplier-delays", action: "stock.supplier.delay.list", layer: "REST" },
  { method: "POST", path: "stock/supplier-delays", action: "stock.supplier.delay.notify", layer: "REST" },
  { method: "GET", path: "stock/materials", action: "stock.material.list", layer: "REST" },
  { method: "GET", path: "stock/materials/:materialId", action: "stock.material.get", layer: "REST" },
  { method: "PUT", path: "stock/materials", action: "stock.material.upsert", layer: "REST" },
  { method: "GET", path: "stock/lots", action: "stock.lot.list", layer: "REST" },
  { method: "POST", path: "stock/lots", action: "stock.lot.create", layer: "REST" },
  { method: "PATCH", path: "stock/lots/:id", action: "stock.lot.update", layer: "REST" },
  { method: "POST", path: "stock/transfers", action: "stock.transfer.create", layer: "REST" },
  { method: "GET", path: "stock/purchase-orders", action: "stock.po.list", layer: "REST" },
  { method: "POST", path: "stock/purchase-orders", action: "stock.po.create", layer: "REST" },
  { method: "PATCH", path: "stock/purchase-orders/:id", action: "stock.po.update", layer: "REST" },
  { method: "POST", path: "stock/purchase-orders/:id/receive", action: "stock.po.receive", layer: "REST" }
];

export const restStockAliases: RouteAliasMap = toAliases(restStockRoutes);
