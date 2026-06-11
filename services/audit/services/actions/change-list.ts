import type { ActionSchema } from "moleculer";
import { getDb } from "../../src/db.js";
import { listAuditChanges } from "../../src/lib/audit-helpers.js";
import { parseParams, requireAuth } from "@aeronexis/services-shared";
import { changeListSchema } from "../../src/lib/schemas.js";

export const changeListAction: ActionSchema = {
  async handler(ctx) {
    const params = parseParams(changeListSchema, ctx.params);
    const auth = await requireAuth(ctx, params.accessToken);

    const listParams = { ...params };
    if (!auth.roles?.includes("admin")) {
      listParams.userId = auth.sub;
    }

    const db = getDb();
    return listAuditChanges(db, listParams);
  }
};
