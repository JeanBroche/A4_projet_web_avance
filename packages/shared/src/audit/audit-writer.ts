import type { AuditLogInput, UserActionLoggedPayload } from "./types.js";

export const DEFAULT_AUDIT_TOPIC = "user.action.logged";

export interface AuditWriterLogger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
}

export interface CreateAuditWriterOptions {
  emit: (topic: string, payload: UserActionLoggedPayload) => Promise<void> | void;
  topic?: string;
  logger?: AuditWriterLogger;
}

function normalizeEntry(input: AuditLogInput): UserActionLoggedPayload {
  if (!input.action?.trim()) {
    throw new Error("auditWriter: action is required");
  }

  return {
    ...input,
    action: input.action.trim(),
    severity: input.severity ?? "INFO",
    timestamp: new Date().toISOString()
  };
}

export function createAuditWriter(options: CreateAuditWriterOptions) {
  const topic = options.topic ?? DEFAULT_AUDIT_TOPIC;
  const logger = options.logger;

  return async function writeAudit(input: AuditLogInput): Promise<UserActionLoggedPayload> {
    const payload = normalizeEntry(input);

    try {
      await options.emit(topic, payload);
      logger?.info("audit.event.emitted", { topic, action: payload.action });
    } catch (error) {
      logger?.warn("audit.event.emit_failed", {
        topic,
        action: payload.action,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }

    return payload;
  };
}

export type AuditWriter = ReturnType<typeof createAuditWriter>;
