import type { Service } from "moleculer";

export function publishShipmentEvent(service: Service, topic: string, payload: object) {
  service.broker.emit(topic, payload);
  service.logger.info("shipment.event.emitted", { topic });
}
