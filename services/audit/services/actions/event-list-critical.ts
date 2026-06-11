import type { ActionSchema } from "moleculer";
import { getDb } from "../../src/db.js";
import { listCriticalEvents } from "../../src/lib/audit-helpers.js";
import { assertSiteAccess, parseParams, requireDirection, resolveEffectiveSite } from "@aeronexis/services-shared";
import { eventListCriticalSchema } from "../../src/lib/schemas.js";

export const eventListCriticalAction: ActionSchema = {
  async handler(ctx) {
    const params = parseParams(eventListCriticalSchema, ctx.params);
    const auth = await requireDirection(ctx, params.accessToken);
    const effectiveSite = resolveEffectiveSite(auth, params);
    if (effectiveSite) {
      assertSiteAccess(auth, effectiveSite);
    }

    const db = getDb();
    return listCriticalEvents(db, {
      ...params,
      siteCode: effectiveSite ?? params.siteCode
    });
  }
};
