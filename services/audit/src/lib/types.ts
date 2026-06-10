export type AuditSeverity = "INFO" | "WARNING" | "CRITICAL";

export interface UserActionLoggedPayload {
  action: string;
  actorId?: string;
  actorEmail?: string;
  roles?: string[];
  entity?: string;
  entityId?: string;
  diff?: { before?: unknown; after?: unknown };
  metadata?: Record<string, unknown>;
  correlationId?: string;
  siteCode?: string;
  severity?: AuditSeverity;
  timestamp: string;
}
