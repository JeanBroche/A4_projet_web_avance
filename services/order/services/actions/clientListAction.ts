import { Context } from "moleculer";
import { prisma } from "../../src/db.js";
import {
  assertSiteAccess,
  parseParams,
  requireOrderRead,
  resolveEffectiveSite
} from "@aeronexis/services-shared";
import { clientListSchema } from "../../src/lib/schemas.js";

export const clientListAction = {
  async handler(ctx: Context) {
    const params = parseParams(clientListSchema, ctx.params);
    const auth = await requireOrderRead(ctx, params.accessToken);
    const effectiveSite = resolveEffectiveSite(auth, params);
    if (effectiveSite) {
      assertSiteAccess(auth, effectiveSite);
    }

    const where = {
      deletedAt: null,
      status: "active",
      ...(effectiveSite ? { siteCode: effectiveSite } : {}),
      ...(params.code ? { code: params.code } : {})
    };

    const [items, total] = await Promise.all([
      prisma.client.findMany({
        where,
        orderBy: [{ siteCode: "asc" }, { code: "asc" }],
        take: params.limit ?? 100,
        skip: params.offset ?? 0
      }),
      prisma.client.count({ where })
    ]);

    return { total, limit: params.limit ?? 100, offset: params.offset ?? 0, items };
  }
};
