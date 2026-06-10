import type { AuditLogInput } from "./types.js";
import { createAuditWriter, type AuditWriterLogger } from "./audit-writer.js";

export interface ServiceAuditEmitter {
  broker: {
    emit: (topic: string, payload: unknown) => void;
  };
  logger: AuditWriterLogger;
}

export function createServiceAuditLogger(service: ServiceAuditEmitter) {
  const writeAudit = createAuditWriter({
    emit: (topic, payload) => {
      service.broker.emit(topic, payload);
    },
    logger: service.logger
  });

  return async function logAudit(input: AuditLogInput) {
    try {
      await writeAudit(input);
    } catch {
      // Audit must not block business mutations.
    }
  };
}

export type ServiceAuditLogger = ReturnType<typeof createServiceAuditLogger>;
