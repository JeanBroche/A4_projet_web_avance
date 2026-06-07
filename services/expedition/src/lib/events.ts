import type { Service } from "moleculer";

export function publishExpeditionEvent(service: Service, topic: string, payload: object) {
  service.logger.info("expedition.event.pending", {
    topic,
    payload
  });
}
