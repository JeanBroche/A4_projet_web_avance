import type { Service } from "moleculer";
import type { DomainEventTopic } from "@aeronexis/shared";

export function publishProductionEvent(
  service: Service,
  topic: DomainEventTopic,
  payload: object
) {
  service.broker.emit(topic, payload);
  service.logger.info("production.event.emitted", { topic });
}
