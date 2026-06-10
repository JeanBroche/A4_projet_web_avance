import type { Service } from "moleculer";

export function publishAuditEvent(service: Service, topic: string, payload: object) {
  service.broker.emit(topic, payload);
  service.logger.info("audit.event.emitted", { topic });
}
