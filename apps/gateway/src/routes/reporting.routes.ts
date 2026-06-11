import type { RouteAliasMap, RouteDefinition } from "./types.js";
import { toAliases } from "./auth.routes.js";

export const restReportingRoutes: RouteDefinition[] = [
  { method: "GET", path: "reporting/kpis/logistique/rupture", action: "reporting.calcul.logistique.rupture", layer: "REST" },
  { method: "GET", path: "reporting/kpis/logistique/rotation", action: "reporting.calcul.logistique.rotation", layer: "REST" },
  { method: "GET", path: "reporting/kpis/commercial/urgent-orders", action: "reporting.calcul.commerciaux.urgentOrders", layer: "REST" },
  { method: "GET", path: "reporting/kpis/commercial/delay-risk", action: "reporting.calcul.commerciaux.delayRiskOrders", layer: "REST" },
  { method: "GET", path: "reporting/kpis/finance/margin", action: "reporting.calcul.finance.margin", layer: "REST" },
  { method: "GET", path: "reporting/kpis/finance/total-delay", action: "reporting.calcul.finance.totalDelay", layer: "REST" },
  { method: "GET", path: "reporting/kpis/production/avancement", action: "reporting.calcul.production.avancement", layer: "REST" },
  { method: "GET", path: "reporting/kpis/production/retard-lots", action: "reporting.calcul.production.retardLots", layer: "REST" }
];

export const restReportingAliases: RouteAliasMap = toAliases(restReportingRoutes);
