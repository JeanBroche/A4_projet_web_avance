export const APP_NAME = "AERONEXIS";

export {
  createAuditWriter,
  DEFAULT_AUDIT_TOPIC,
  type AuditWriter,
  type AuditWriterLogger,
  type CreateAuditWriterOptions
} from "./audit/audit-writer.js";

export {
  createServiceAuditLogger,
  type ServiceAuditEmitter,
  type ServiceAuditLogger
} from "./audit/service-audit-logger.js";

export type {
  AuditDiff,
  AuditLogEntry,
  AuditLogInput,
  AuditSeverity,
  CriticalEventEntry,
  CriticalEventInput,
  UserActionLoggedPayload
} from "./audit/types.js";
