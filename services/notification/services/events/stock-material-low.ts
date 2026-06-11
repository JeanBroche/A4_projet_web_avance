import type { Context } from "moleculer";
import { appendNotification } from "../../src/lib/inbox.js";
import { buildDedupKey } from "../../src/lib/rules.js";

type MaterialLowPayload = {
  alertId?: string;
  materialId: string;
  materialCode?: string;
  siteCode: string;
  severity?: string;
  available?: number;
  minimum?: number;
  message?: string;
};

export async function handleStockMaterialLow(ctx: Context<MaterialLowPayload>) {
  const payload = ctx.params;
  if (!payload.siteCode || !payload.materialId) {
    return;
  }

  const severity = payload.severity === "CRITICAL" ? "CRITICAL" : "WARNING";
  const code = payload.materialCode ?? payload.materialId;
  const available = payload.available ?? 0;

  const record = await appendNotification(
    {
      type: "stock.material.low",
      severity,
      title: severity === "CRITICAL" ? "Rupture stock" : "Stock sous seuil",
      message:
        payload.message ??
        `Matériau ${code} : disponible ${available}, seuil ${payload.minimum ?? "?"}`,
      siteCode: payload.siteCode,
      payload: {
        alertId: payload.alertId,
        materialId: payload.materialId,
        materialCode: payload.materialCode,
        available: payload.available,
        minimum: payload.minimum
      }
    },
    buildDedupKey("stock.material.low", {
      materialId: payload.materialId,
      severity
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
