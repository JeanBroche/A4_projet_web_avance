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

export {
  isBatchOfId,
  orderNumberFromOfId,
  parseLotTraceKey,
  resolveLotIdentity,
  resolveLotId,
  resolveOfId,
  formatStockDocumentRef,
  matchesStockDocumentRef,
  ofIdFromStockDocumentRef,
  type LotTraceIdentity
} from "./of.js";

export {
  computeDelayRisk,
  DEFAULT_DELAY_RISK_THRESHOLD,
  type DelayRiskOrderInput
} from "./order-delay-risk.js";

export { DomainEvents, type DomainEventTopic } from "./domain-events.js";

export {
  SEED_ANOMALY,
  SEED_BATCHES,
  SEED_BOM,
  SEED_CLIENTS,
  SEED_MATERIALS,
  SEED_OF_ID,
  SEED_ORDERS,
  SEED_PICKLISTS,
  SEED_PRODUCTS,
  SEED_SHIPMENTS,
  SEED_SITES,
  SEED_USER_IDS,
  SEED_USERS,
  type SeedSiteCode,
  type SeedUserRole
} from "./seed-scenario.js";
