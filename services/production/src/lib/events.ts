import type { Service } from "moleculer";

export function publishProductionEvent(service: Service, topic: string, payload: object) {
  service.broker.emit(topic, payload);
  service.logger.info("production.event.emitted", { topic });
}
