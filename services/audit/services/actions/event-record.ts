import type { ActionSchema, Service } from "moleculer";
import { getDb } from "../../src/db.js";
import { insertCriticalEvent } from "../../src/lib/audit-helpers.js";
import { publishAuditEvent } from "../../src/lib/events.js";
import { parseParams } from "../../src/lib/parse-params.js";
import { requireAdmin } from "../../src/lib/rbac.js";
import { eventRecordSchema } from "../../src/lib/schemas.js";

export const eventRecordAction: ActionSchema = {
  async handler(this: Service, ctx) {
    const params = parseParams(eventRecordSchema, ctx.params);
    const auth = requireAdmin(ctx, params.accessToken);
    const correlationId = (ctx.meta as { correlationId?: string }).correlationId;

    const db = getDb();
    const event = await insertCriticalEvent(db, {
      severity: params.severity,
      type: params.type,
      message: params.message,
      siteCode: params.siteCode ?? auth.siteId ?? undefined,
      actorId: auth.sub,
      metadata: params.metadata,
      correlationId
    });

    publishAuditEvent(this, "incident.reported", {
      id: event.id,
      severity: event.severity,
      type: event.type,
      message: event.message,
      siteCode: event.siteCode,
      actorId: event.actorId,
      correlationId: event.correlationId
    });

    this.logger.info("Critical event recorded", {
      correlationId,
      eventId: event.id,
      severity: event.severity,
      type: event.type
    });

    return event;
  }
};
