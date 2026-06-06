/**
 * Stub publisher for Kafka events.
 *
 * Kafka integration is deferred to a dedicated infra issue (see plan M4).
 * Each call site logs the intended event so we keep traceability of the
 * future Kafka contract without requiring a broker to be available today.
 *
 * @param {import("moleculer").Service} service
 * @param {string} topic
 * @param {object} payload
 */
export function publishStockEvent(service, topic, payload) {
  service.logger.info("stock.event.pending", {
    topic,
    payload
  });
}
