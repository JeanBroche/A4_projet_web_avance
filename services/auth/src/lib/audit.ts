import type { Service } from "moleculer";
import {
  createServiceAuditLogger,
  type AuditLogInput,
  type ServiceAuditLogger
} from "@aeronexis/shared";

let logAudit: ServiceAuditLogger | null = null;

export function initAuthAuditWriter(service: Service) {
  logAudit = createServiceAuditLogger(service);
}

export async function logAuthAudit(input: AuditLogInput) {
  await logAudit?.(input);
}
