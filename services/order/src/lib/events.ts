import type { Service } from "moleculer";

export function publishOrderEvent(service: Service, topic: string, payload: object) {
  service.logger.info("order.event.pending", {
    topic,
    payload
  });
}
