import type { NotificationInput, NotificationSeverity } from "./types.js";

export function buildDedupKey(type: string, parts: Record<string, unknown>) {
  const suffix = Object.entries(parts)
    .filter(([, value]) => value !== undefined && value !== null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${String(value)}`)
    .join("|");
  return `${type}:${suffix}`;
}

export function severityRank(severity: NotificationSeverity) {
  switch (severity) {
    case "CRITICAL":
      return 3;
    case "WARNING":
      return 2;
    default:
      return 1;
  }
}

export function formatNotificationTitle(type: string, fallback: string) {
  const labels: Record<string, string> = {
    "stock.material.low": "Rupture ou seuil stock",
    "stock.supplier.delay": "Retard fournisseur",
    "shipment.delivery.alert": "Retard livraison"
  };
  return labels[type] ?? fallback;
}

export function normalizeNotification(input: NotificationInput): NotificationInput {
  return {
    ...input,
    title: input.title || formatNotificationTitle(input.type, input.type)
  };
}
