import { Context } from "moleculer";
import { prisma } from "../../src/db.js";
import { assertSiteAccess, parseParams, requireCommercial } from "@aeronexis/services-shared";
import { clientUpsertSchema } from "../../src/lib/schemas.js";
import { logOrderAudit } from "../../src/lib/audit.js";

export const clientUpsertAction = {
  async handler(ctx: Context) {
    const params = parseParams(clientUpsertSchema, ctx.params);
    const auth = await requireCommercial(ctx, params.accessToken);
    assertSiteAccess(auth, params.siteCode);

    const existing = await prisma.client.findFirst({
      where: {
        code: params.code,
        siteCode: params.siteCode,
        deletedAt: null
      }
    });

    const client = existing
      ? await prisma.client.update({
          where: { id: existing.id },
          data: {
            name: params.name,
            country: params.country,
            type: params.type,
            annualRevenue: params.annualRevenue,
            firstContractDate: params.firstContractDate,
            status: params.status ?? existing.status
          }
        })
      : await prisma.client.create({
          data: {
            code: params.code,
            name: params.name,
            siteCode: params.siteCode,
            country: params.country,
            type: params.type,
            annualRevenue: params.annualRevenue,
            firstContractDate: params.firstContractDate,
            status: params.status ?? "active"
          }
        });

    await logOrderAudit({
      action: existing ? "order.client.update" : "order.client.create",
      actorId: auth.sub,
      actorEmail: auth.email,
      roles: auth.roles,
      entity: "Client",
      entityId: client.id,
      siteCode: client.siteCode,
      correlationId: (ctx.meta as { correlationId?: string }).correlationId,
      metadata: { code: client.code, name: client.name }
    });

    return client;
  }
};
