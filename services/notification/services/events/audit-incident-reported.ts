import type { Context } from "moleculer";
import { appendNotification } from "../../src/lib/inbox.js";
import { buildDedupKey } from "../../src/lib/rules.js";

type IncidentPayload = {
  severity?: "CRITICAL" | "WARNING";
  type?: string;
  message?: string;
  siteCode?: string;
  metadata?: Record<string, unknown>;
};

export async function handleAuditIncidentReported(ctx: Context<IncidentPayload>) {
  const payload = ctx.params;
  if (!payload.siteCode || !payload.message) {
    return;
  }

  const severity = payload.severity === "CRITICAL" ? "CRITICAL" : "WARNING";
  const record = await appendNotification(
    {
      type: "audit.incident.reported",
      severity,
      title: severity === "CRITICAL" ? "Incident critique" : "Incident production",
      message: payload.message,
      siteCode: payload.siteCode,
      payload: {
        incidentType: payload.type,
        metadata: payload.metadata
      }
    },
    buildDedupKey("audit.incident.reported", {
      siteCode: payload.siteCode,
      type: payload.type ?? "unknown",
      message: payload.message
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
