import type { ServiceSchema } from "moleculer";

import {
  ruptureStockCalculation,
  rotationStockCalculation,
  urgentOrdersCalculation,
  delayRiskOrdersCalculation,
  marginCalculation,
  totalDelayCalculation,
  avancementCalculation,
  retardLotsCalculation
} from "./actions/index.js";

const ReportingService: ServiceSchema = {
  name: "reporting",

  actions: {
    ping: {
      handler(ctx) {
        this.logger.info("Ping", { correlationId: ctx.meta.correlationId });
        return "pong";
      }
    },

    "calcul.logistique.rupture": ruptureStockCalculation,
    "calcul.logistique.rotation": rotationStockCalculation,

    "calcul.commerciaux.urgentOrders": urgentOrdersCalculation,
    "calcul.commerciaux.delayRiskOrders": delayRiskOrdersCalculation,

    "calcul.finance.margin": marginCalculation,
    "calcul.finance.totalDelay": totalDelayCalculation,

    "calcul.production.avancement": avancementCalculation,
    "calcul.production.retardLots": retardLotsCalculation
  }
};

export default ReportingService;
