import type { ActionSchema } from "moleculer";
import { getDb } from "../../src/db.js";
import { listAuditChanges } from "../../src/lib/audit-helpers.js";
import { parseParams } from "../../src/lib/parse-params.js";
import { requireAdmin } from "../../src/lib/rbac.js";
import { changeListSchema } from "../../src/lib/schemas.js";

export const changeListAction: ActionSchema = {
  async handler(ctx) {
    const params = parseParams(changeListSchema, ctx.params);
    requireAdmin(ctx, params.accessToken);

    const db = getDb();
    return listAuditChanges(db, params);
  }
};
