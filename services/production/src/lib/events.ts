import type { Service } from "moleculer";

export function publishProductionEvent(service: Service, topic: string, payload: object) {
  service.logger.info("production.event.pending", {
    topic,
    payload
  });
}
