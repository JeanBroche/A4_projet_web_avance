import type { ServiceSchema } from "moleculer";

import { 
  orderCreateAction,
  orderGetAction,
  orderStatusAction,
  orderSetPriorityAction,
  orderListUrgentAction,
  orderDelayRiskAction,
  clientStatsAction,
  orderHistoryAction,
  orderValidateAction,
  orderRejectAction,
 } from "./actions/index.js"

const OrderService: ServiceSchema = {
  name: "order",

  actions: {
    ping: {
      handler(ctx) {
        this.logger.info("Ping", { correlationId: ctx.meta.correlationId });
        return "pong";
      }
    },

    "order.create": orderCreateAction,

    "order.get": orderGetAction,

    "order.status": orderStatusAction,

    "order.setPriority": orderSetPriorityAction,

    "order.listUrgent": orderListUrgentAction,

    "order.delayRisk": orderDelayRiskAction,

    "client.stats": clientStatsAction,

    "order.history": orderHistoryAction,

    "order.validate": orderValidateAction,

    "order.reject": orderRejectAction,
  }
};

export default OrderService;
