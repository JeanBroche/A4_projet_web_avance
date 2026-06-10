import type { Service } from "moleculer";

export function publishShipmentEvent(service: Service, topic: string, payload: object) {
  service.logger.info("shipment.event.pending", {
    topic,
    payload
  });
}
