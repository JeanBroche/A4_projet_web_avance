import type { Service } from "moleculer";
import {
  createServiceAuditLogger,
  type AuditLogInput,
  type ServiceAuditLogger
} from "@aeronexis/shared";

let logAudit: ServiceAuditLogger | null = null;

export function initShipmentAuditWriter(service: Service) {
  logAudit = createServiceAuditLogger(service);
}

export async function logShipmentAudit(input: AuditLogInput) {
  await logAudit?.(input);
}
