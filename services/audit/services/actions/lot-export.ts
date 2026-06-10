import type { ActionSchema } from "moleculer";
import { getDb } from "../../src/db.js";
import { buildLotTrace, timelineToCsv } from "../../src/lib/lot-trace-helpers.js";
import { parseParams, requireAdmin } from "@aeronexis/services-shared";
import { lotExportSchema } from "../../src/lib/schemas.js";

export const lotExportAction: ActionSchema = {
  async handler(ctx) {
    const params = parseParams(lotExportSchema, ctx.params);
    requireAdmin(ctx, params.accessToken);

    const db = getDb();
    const trace = await buildLotTrace(db, ctx, params.lotId, params.accessToken);
    return timelineToCsv(params.lotId, trace.timeline);
  }
};
