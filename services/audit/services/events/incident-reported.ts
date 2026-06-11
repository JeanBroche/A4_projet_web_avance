import type { Context, Service } from "moleculer";
import { DomainEvents } from "@aeronexis/shared";
import { getDb } from "../../src/db.js";
import { insertCriticalEvent } from "../../src/lib/audit-helpers.js";

export type IncidentReportedPayload = {
  severity: "CRITICAL" | "WARNING";
  type: string;
  message: string;
  siteCode?: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
  correlationId?: string;
};

export const incidentReportedEvent = {
  [DomainEvents.audit.incidentReported]: {
    async handler(this: Service, ctx: Context<IncidentReportedPayload>) {
      const payload = ctx.params;
      if (!payload.type || !payload.message) {
        return;
      }

      const db = getDb();
      const event = await insertCriticalEvent(db, {
        severity: payload.severity ?? "WARNING",
        type: payload.type,
        message: payload.message,
        siteCode: payload.siteCode,
        actorId: payload.actorId,
        metadata: payload.metadata,
        correlationId: payload.correlationId ?? (ctx.meta as { correlationId?: string }).correlationId
      });

      this.logger.info("audit.incident.persisted", {
        eventId: event.id,
        severity: event.severity,
        type: event.type,
        siteCode: event.siteCode
      });
    }
  }
};
