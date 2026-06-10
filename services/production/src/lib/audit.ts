import type { Service } from "moleculer";
import type { AccessTokenPayload } from "@aeronexis/services-shared";
import {
  createServiceAuditLogger,
  type AuditLogInput,
  type ServiceAuditLogger
} from "@aeronexis/shared";

let logAudit: ServiceAuditLogger | null = null;

export function initProductionAuditWriter(service: Service) {
  logAudit = createServiceAuditLogger(service);
}

export async function logProductionAudit(input: AuditLogInput) {
  await logAudit?.(input);
}

export async function logProductionMutation(
  auth: AccessTokenPayload,
  correlationId: string | undefined,
  input: Omit<AuditLogInput, "actorId" | "actorEmail" | "roles" | "correlationId">
) {
  await logProductionAudit({
    ...input,
    actorId: auth.sub,
    actorEmail: auth.email,
    roles: auth.roles,
    correlationId
  });
}
