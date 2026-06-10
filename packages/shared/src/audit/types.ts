export type AuditSeverity = "INFO" | "WARNING" | "CRITICAL";

export interface AuditDiff {
  before?: unknown;
  after?: unknown;
}

export interface AuditLogInput {
  action: string;
  actorId?: string;
  actorEmail?: string;
  roles?: string[];
  entity?: string;
  entityId?: string;
  diff?: AuditDiff;
  metadata?: Record<string, unknown>;
  correlationId?: string;
  siteCode?: string;
  severity?: AuditSeverity;
}

export interface AuditLogEntry extends AuditLogInput {
  userId?: string;
  timestamp: string;
}

export interface UserActionLoggedPayload extends AuditLogInput {
  timestamp: string;
}

export interface CriticalEventInput {
  severity: "CRITICAL" | "WARNING";
  type: string;
  message: string;
  siteCode?: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
  correlationId?: string;
}

export interface CriticalEventEntry extends CriticalEventInput {
  timestamp: string;
}
