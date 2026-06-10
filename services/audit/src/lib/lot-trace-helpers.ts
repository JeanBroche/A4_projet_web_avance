import type { Context } from "moleculer";
import type { Db } from "mongodb";
import { COLLECTIONS } from "../db.js";
import { createError } from "./errors.js";
import type { EventHistoryDocument, LotProgressDocument } from "./audit-helpers.js";

export interface TimelineEntry {
  timestamp: string;
  source: string;
  type: string;
  label: string;
  status?: "ok" | "unavailable";
  payload?: Record<string, unknown>;
}

type StockMovement = {
  id: string;
  type: string;
  quantity: number;
  documentRef?: string | null;
  reason?: string | null;
  createdAt: string | Date;
  siteCode: string;
};

type ShipmentHistoryItem = {
  id: string;
  code: string;
  orderNumber: string;
  status: string;
  createdAt: string | Date;
  siteCode: string;
};

function toIso(value: string | Date) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function matchesRef(documentRef: string | null | undefined, lotId: string, ofId: string) {
  if (!documentRef) {
    return false;
  }
  return documentRef.includes(lotId) || documentRef.includes(ofId);
}

async function fetchStockMovements(
  ctx: Context,
  params: { siteCode: string; lotId: string; ofId: string; accessToken?: string }
): Promise<TimelineEntry[]> {
  try {
    const movements = (await ctx.call("stock.movement.list", {
      siteCode: params.siteCode,
      accessToken: params.accessToken,
      limit: 500
    })) as StockMovement[];

    return movements
      .filter((movement) => matchesRef(movement.documentRef, params.lotId, params.ofId))
      .map((movement) => ({
        timestamp: toIso(movement.createdAt),
        source: "stock",
        type: "stock.movement",
        label: `Stock ${movement.type} (${movement.quantity})`,
        status: "ok" as const,
        payload: {
          movementId: movement.id,
          type: movement.type,
          quantity: movement.quantity,
          documentRef: movement.documentRef,
          reason: movement.reason
        }
      }));
  } catch {
    return [
      {
        timestamp: new Date().toISOString(),
        source: "stock",
        type: "stock.unavailable",
        label: "Stock service unavailable",
        status: "unavailable"
      }
    ];
  }
}

async function fetchExpeditionHistory(
  ctx: Context,
  params: { siteCode: string; ofId: string; accessToken?: string }
): Promise<TimelineEntry[]> {
  try {
    const result = (await ctx.call("expedition.shipment.history", {
      siteCode: params.siteCode,
      accessToken: params.accessToken,
      page: 1,
      pageSize: 100
    })) as { items: ShipmentHistoryItem[] };

    return result.items
      .filter((item) => item.siteCode === params.siteCode)
      .map((item) => ({
        timestamp: toIso(item.createdAt),
        source: "expedition",
        type: "expedition.shipment",
        label: `Shipment ${item.code} (${item.status})`,
        status: "ok" as const,
        payload: {
          shipmentId: item.id,
          code: item.code,
          orderNumber: item.orderNumber,
          status: item.status
        }
      }));
  } catch {
    return [
      {
        timestamp: new Date().toISOString(),
        source: "expedition",
        type: "expedition.unavailable",
        label: "Expedition service unavailable",
        status: "unavailable"
      }
    ];
  }
}

function mapEventHistory(events: EventHistoryDocument[]): TimelineEntry[] {
  return events.map((event) => ({
    timestamp: event.timestamp.toISOString(),
    source: "audit",
    type: event.type,
    label: event.type.replace(/\./g, " / "),
    status: "ok" as const,
    payload: {
      lotId: event.lotId,
      ofId: event.ofId,
      siteCode: event.siteCode,
      ...(event.payload ?? {})
    }
  }));
}

export async function buildLotTrace(
  db: Db,
  ctx: Context,
  lotId: string,
  accessToken?: string
) {
  const lot = await db
    .collection<LotProgressDocument>(COLLECTIONS.lotProgressAudit)
    .findOne({ lotId });

  if (!lot) {
    throw createError("NOT_FOUND", `Lot trace not found: ${lotId}`);
  }

  const events = await db
    .collection<EventHistoryDocument>(COLLECTIONS.eventHistory)
    .find({ $or: [{ lotId }, { ofId: lot.ofId }] })
    .sort({ timestamp: 1 })
    .toArray();

  const [stockEntries, expeditionEntries] = await Promise.all([
    fetchStockMovements(ctx, {
      siteCode: lot.siteCode,
      lotId,
      ofId: lot.ofId,
      accessToken
    }),
    fetchExpeditionHistory(ctx, {
      siteCode: lot.siteCode,
      ofId: lot.ofId,
      accessToken
    })
  ]);

  const timeline = [...mapEventHistory(events), ...stockEntries, ...expeditionEntries].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return {
    lot: {
      lotId: lot.lotId,
      ofId: lot.ofId,
      siteCode: lot.siteCode,
      status: lot.status,
      productCode: lot.productCode,
      createdAt: lot.createdAt.toISOString(),
      updatedAt: lot.updatedAt.toISOString()
    },
    timeline,
    summary: {
      eventCount: timeline.length,
      sources: [...new Set(timeline.map((entry) => entry.source))]
    }
  };
}

export function timelineToCsv(lotId: string, timeline: TimelineEntry[]) {
  const header = "timestamp,source,type,label,status,payload";
  const rows = timeline.map((entry) => {
    const payload = entry.payload ? JSON.stringify(entry.payload).replace(/"/g, '""') : "";
    return [
      entry.timestamp,
      entry.source,
      entry.type,
      entry.label.replace(/"/g, '""'),
      entry.status ?? "ok",
      `"${payload}"`
    ].join(",");
  });

  return {
    format: "csv" as const,
    filename: `${lotId}-trace.csv`,
    content: [header, ...rows].join("\n")
  };
}
