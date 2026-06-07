import type { Service } from "moleculer";

export function publishStockEvent(service: Service, topic: string, payload: object) {
  service.logger.info("stock.event.pending", {
    topic,
    payload
  });
}
