import { Context } from "moleculer";
import { prisma } from "../../src/db.js";
import { assertSiteAccess, createError, parseParams, requireOrderRead } from "@aeronexis/services-shared";
import { clientGetSchema } from "../../src/lib/schemas.js";
import { loadActiveClient } from "../../src/lib/order-helpers.js";

export const clientGetAction = {
  async handler(ctx: Context) {
    const params = parseParams(clientGetSchema, ctx.params);
    const auth = await requireOrderRead(ctx, params.accessToken);

    const client = params.clientId
      ? await loadActiveClient(prisma, params.clientId)
      : await prisma.client.findFirst({
          where: {
            code: params.code!,
            siteCode: params.siteCode!,
            deletedAt: null,
            status: "active"
          }
        });

    if (!client) {
      throw createError("NOT_FOUND", "Client not found");
    }

    assertSiteAccess(auth, client.siteCode);
    return client;
  }
};
