import type { ActionSchema } from "moleculer";
import { getDb } from "../../src/db.js";
import { buildLotTrace } from "../../src/lib/lot-trace-helpers.js";
import { assertSiteAccess, parseParams, requireTraceRead } from "@aeronexis/services-shared";
import { lotTraceSchema } from "../../src/lib/schemas.js";

export const lotTraceAction: ActionSchema = {
  async handler(ctx) {
    const params = parseParams(lotTraceSchema, ctx.params);
    const auth = await requireTraceRead(ctx, params.accessToken);
    const trace = await buildLotTrace(getDb(), ctx, params.lotId, params.accessToken);
    assertSiteAccess(auth, trace.lot.siteCode);
    return trace;
  }
};
