import type { ActionSchema } from "moleculer";
import { getDb } from "../../src/db.js";
import { listCriticalEvents } from "../../src/lib/audit-helpers.js";
import { parseParams } from "../../src/lib/parse-params.js";
import { requireAdmin } from "../../src/lib/rbac.js";
import { eventListCriticalSchema } from "../../src/lib/schemas.js";

export const eventListCriticalAction: ActionSchema = {
  async handler(ctx) {
    const params = parseParams(eventListCriticalSchema, ctx.params);
    requireAdmin(ctx, params.accessToken);

    const db = getDb();
    return listCriticalEvents(db, params);
  }
};
