import type { Service } from "moleculer";

export function publishAuditEvent(service: Service, topic: string, payload: object) {
  service.logger.info("audit.event.pending", {
    topic,
    payload
  });
}
