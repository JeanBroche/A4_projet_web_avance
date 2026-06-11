import type { Service, ServiceSchema } from "moleculer";
import { initOrderAuditWriter } from "../src/lib/audit.js";
import {
  handleProductionFinished,
  syncOrderFromShipmentStatus,
  type ProductionFinishedPayload,
  type ShipmentStatusChangedPayload
} from "../src/lib/order-integration.js";
import {
  orderCreateAction,
  orderGetAction,
  orderStatusAction,
  orderSetPriorityAction,
  orderListUrgentAction,
  orderDelayRiskAction,
  clientStatsAction,
  clientListAction,
  clientGetAction,
  clientUpsertAction,
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

    "client.list": clientListAction,

    "client.get": clientGetAction,

    "client.upsert": clientUpsertAction,

    "order.history": orderHistoryAction,

    "order.validate": orderValidateAction,

    "order.reject": orderRejectAction,

    "order.startProduction": orderStartProductionAction,

    "order.finish": orderFinishAction,

    "order.markShipped": orderMarkShippedAction,

    "order.markDelivered": orderMarkDeliveredAction,
  },

  events: {
    "production.manu_order.finished": {
      async handler(this: Service, ctx: { params: ProductionFinishedPayload }) {
        await handleProductionFinished(ctx as Parameters<typeof handleProductionFinished>[0]);
      }
    },
    "shipment.status.changed": {
      async handler(this: Service, ctx: { params: ShipmentStatusChangedPayload }) {
        await syncOrderFromShipmentStatus(this, ctx.params);
      }
    }
  }
};

export default OrderService;
