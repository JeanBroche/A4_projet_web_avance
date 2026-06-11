import type { Context } from "moleculer";
import { appendNotification } from "../../src/lib/inbox.js";
import { buildDedupKey } from "../../src/lib/rules.js";

type DeliveryAlertPayload = {
  id?: string;
  code?: string;
  orderNumber?: string;
  siteCode: string;
  status?: string;
  plannedShipDate?: string | Date;
  daysLate?: number;
};

export async function handleShipmentDeliveryAlert(ctx: Context<DeliveryAlertPayload>) {
  const payload = ctx.params;
  if (!payload.siteCode) {
    return;
  }

  const daysLate = payload.daysLate ?? 0;
  const code = payload.code ?? payload.id ?? "expédition";

  const record = await appendNotification(
    {
      type: "shipment.delivery.alert",
      severity: daysLate >= 3 ? "CRITICAL" : "WARNING",
      title: "Retard livraison",
      message: `Expédition ${code} en retard de ${daysLate} jour(s) (statut ${payload.status ?? "?"})`,
      siteCode: payload.siteCode,
      payload: {
        shipmentId: payload.id,
        code: payload.code,
        orderNumber: payload.orderNumber,
        status: payload.status,
        plannedShipDate: payload.plannedShipDate,
        daysLate
      }
    },
    buildDedupKey("shipment.delivery.alert", {
      shipmentId: payload.id ?? payload.code,
      daysLate
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
