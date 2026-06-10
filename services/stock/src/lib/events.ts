import type { Service } from "moleculer";

export function publishStockEvent(service: Service, topic: string, payload: object) {
  service.broker.emit(topic, payload);
  service.logger.info("stock.event.emitted", { topic });
}
