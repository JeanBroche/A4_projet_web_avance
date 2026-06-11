import type { Context } from "moleculer";
import { appendNotification } from "../../src/lib/inbox.js";
import { buildDedupKey } from "../../src/lib/rules.js";

type SupplierDelayPayload = {
  delayId?: string;
  materialId: string;
  materialCode?: string;
  siteCode?: string;
  supplier?: string;
  notes?: string;
};

export async function handleSupplierDelay(ctx: Context<SupplierDelayPayload>) {
  const payload = ctx.params;
  if (!payload.materialId) {
    return;
  }

  const siteCode = payload.siteCode ?? "SITE-LYO";
  const supplier = payload.supplier ?? "fournisseur inconnu";

  const record = await appendNotification(
    {
      type: "stock.supplier.delay",
      severity: "WARNING",
      title: "Retard fournisseur",
      message: `Retard déclaré pour ${payload.materialCode ?? payload.materialId} (${supplier})`,
      siteCode,
      payload: {
        delayId: payload.delayId,
        materialId: payload.materialId,
        materialCode: payload.materialCode,
        supplier: payload.supplier,
        notes: payload.notes
      }
    },
    buildDedupKey("stock.supplier.delay", {
      delayId: payload.delayId ?? payload.materialId
    })
  );

  if (record) {
    ctx.service?.logger.info("notification.created", {
      type: record.type,
      siteCode: record.siteCode,
      notificationId: record.id
    });
  }
}
