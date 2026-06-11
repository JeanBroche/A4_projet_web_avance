import type { RouteAliasMap, RouteDefinition } from "./types.js";
import { toAliases } from "./auth.routes.js";

export const restProductionRoutes: RouteDefinition[] = [
  { method: "GET", path: "production/bom", action: "production.bom.list", layer: "REST" },
  { method: "POST", path: "production/bom", action: "production.bom.create", layer: "REST" },
  { method: "GET", path: "production/bom/:bomCode", action: "production.bom.get", layer: "REST" },
  { method: "PATCH", path: "production/bom/:bomCode", action: "production.bom.update", layer: "REST" },
  { method: "DELETE", path: "production/bom/:bomCode", action: "production.bom.delete", layer: "REST" },
  { method: "GET", path: "production/batches", action: "production.batch.list", layer: "REST" },
  { method: "POST", path: "production/batches", action: "production.batch.create", layer: "REST" },
  { method: "GET", path: "production/batches/:batchCode", action: "production.batch.get", layer: "REST" },
  { method: "PATCH", path: "production/batches/:batchCode", action: "production.batch.update", layer: "REST" },
  { method: "DELETE", path: "production/batches/:batchCode", action: "production.batch.delete", layer: "REST" },
  { method: "PATCH", path: "production/batches/:batchCode/progress", action: "production.batch.progress", layer: "REST" },
  { method: "PATCH", path: "production/batches/:batchCode/reschedule", action: "production.batch.reschedule", layer: "REST" },
  { method: "GET", path: "production/batches/:batchCode/history", action: "production.batch.history", layer: "REST" },
  { method: "GET", path: "production/batches/:batchCode/steps", action: "production.batch.steps.list", layer: "REST" },
  { method: "PATCH", path: "production/batches/:batchCode/steps/:stepCode", action: "production.batch.steps.update", layer: "REST" },
  { method: "POST", path: "production/batches/:batchId/anomalies", action: "production.batch.addAnomalies", layer: "REST" },
  { method: "PATCH", path: "production/batches/:batchId/anomalies/:anomalyCode", action: "production.batch.updateAnomalies", layer: "REST" },
  { method: "POST", path: "production/products", action: "production.product.create", layer: "REST" },
  { method: "GET", path: "production/products/:productCode", action: "production.product.get", layer: "REST" },
  { method: "PATCH", path: "production/products/:productCode", action: "production.product.update", layer: "REST" },
  { method: "DELETE", path: "production/products/:productCode", action: "production.product.delete", layer: "REST" }
];

export const restProductionAliases: RouteAliasMap = toAliases(restProductionRoutes);
