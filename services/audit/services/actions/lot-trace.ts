import type { ActionSchema } from "moleculer";
import { getDb } from "../../src/db.js";
import { buildLotTrace } from "../../src/lib/lot-trace-helpers.js";
import { parseParams, requireAdmin } from "@aeronexis/services-shared";
import { lotTraceSchema } from "../../src/lib/schemas.js";

export const lotTraceAction: ActionSchema = {
  async handler(ctx) {
    const params = parseParams(lotTraceSchema, ctx.params);
    await requireAdmin(ctx, params.accessToken);

    const db = getDb();
    return buildLotTrace(db, ctx, params.lotId, params.accessToken);
  }
};
