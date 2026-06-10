import type { Service, ServiceSchema } from "moleculer";
import { initOrderAuditWriter } from "../src/lib/audit.js";
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
  orderStartProductionAction,
  orderFinishAction,
  orderMarkShippedAction,
  orderMarkDeliveredAction,
 } from "./actions/index.js"

const OrderService: ServiceSchema = {
  name: "order",

  started(this: Service) {
    initOrderAuditWriter(this);
  },

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

    "order.startProduction": orderStartProductionAction,

    "order.finish": orderFinishAction,

    "order.markShipped": orderMarkShippedAction,

    "order.markDelivered": orderMarkDeliveredAction,
  }
};

export default OrderService;
