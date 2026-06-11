import type { ServiceSchema } from "moleculer";
import {
  inboxListAction,
  inboxMarkReadAction,
  inboxUnreadCountAction
} from "./actions/inbox.js";
import { handleStockMaterialLow } from "./events/stock-material-low.js";
import { handleSupplierDelay } from "./events/stock-supplier-delay.js";
import { handleShipmentDeliveryAlert } from "./events/shipment-delivery-alert.js";

const NotificationService: ServiceSchema = {
  name: "notification",

  actions: {
    ping: {
      handler(ctx) {
        this.logger.info("Ping", { correlationId: ctx.meta.correlationId });
        return "pong";
      }
    },
    "inbox.list": inboxListAction,
    "inbox.markRead": inboxMarkReadAction,
    "inbox.unreadCount": inboxUnreadCountAction
  },

  events: {
    "stock.material.low": {
      async handler(ctx) {
        await handleStockMaterialLow(ctx);
      }
    },
    "stock.supplier.delay.reported": {
      async handler(ctx) {
        await handleSupplierDelay(ctx);
      }
    },
    "shipment.delivery.alert": {
      async handler(ctx) {
        await handleShipmentDeliveryAlert(ctx);
      }
    }
  }
};

export default NotificationService;
