import type { Service } from "moleculer";
import type { DomainEventTopic } from "@aeronexis/shared";

export function publishOrderEvent(
  service: Service,
  topic: DomainEventTopic,
  payload: object
) {
  service.broker.emit(topic, payload);
  service.logger.info("order.event.emitted", { topic });
}
