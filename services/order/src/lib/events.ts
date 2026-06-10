import type { Service } from "moleculer";

export function publishOrderEvent(service: Service, topic: string, payload: object) {
  service.broker.emit(topic, payload);
  service.logger.info("order.event.emitted", { topic });
}
