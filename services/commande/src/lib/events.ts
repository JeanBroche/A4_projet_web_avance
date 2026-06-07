import type { Service } from "moleculer";

export function publishCommandeEvent(service: Service, topic: string, payload: object) {
  service.logger.info("commande.event.pending", {
    topic,
    payload
  });
}
