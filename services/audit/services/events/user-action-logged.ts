import type { Context, Service } from "moleculer";
import { getDb } from "../../src/db.js";
import { insertAuditLog } from "../../src/lib/audit-helpers.js";
import type { UserActionLoggedPayload } from "@aeronexis/shared";

export const userActionLoggedEvent = {
  async handler(this: Service, ctx: Context<UserActionLoggedPayload>) {
    const payload = ctx.params;
    if (!payload?.action) {
      this.logger.warn("audit.event.invalid_payload", { payload });
      return;
    }

    const db = getDb();
    const entry = await insertAuditLog(db, {
      ...payload,
      timestamp: payload.timestamp || new Date().toISOString()
    });

    this.logger.info("audit.log.persisted", {
      correlationId: (ctx.meta as { correlationId?: string }).correlationId,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId
    });
  }
};
