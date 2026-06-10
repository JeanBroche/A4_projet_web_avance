import type { Service } from "moleculer";
import {
  createServiceAuditLogger,
  type AuditLogInput,
  type ServiceAuditLogger
} from "@aeronexis/shared";

let logAudit: ServiceAuditLogger | null = null;

export function initStockAuditWriter(service: Service) {
  logAudit = createServiceAuditLogger(service);
}

export async function logStockAudit(input: AuditLogInput) {
  await logAudit?.(input);
}
