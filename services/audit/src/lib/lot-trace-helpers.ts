import type { Context } from "moleculer";
import type { Db } from "mongodb";
import { matchesStockDocumentRef, orderNumberFromOfId, parseLotTraceKey } from "@aeronexis/shared";
import { createError } from "@aeronexis/services-shared";
import { COLLECTIONS } from "../db.js";
import type { EventHistoryDocument, LotProgressDocument } from "./audit-helpers.js";
import { findLotProgress } from "./lot-trace-writer.js";

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

type BatchHistoryItem = {
  id: string;
  action: string;
  details?: string | null;
  createdAt: string | Date;
};

function toIso(value: string | Date) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

async function fetchStockMovements(
  ctx: Context,
  params: {
    siteCode: string;
    lotId: string;
    ofId: string;
    orderNumber?: string;
    accessToken?: string;
  }
): Promise<TimelineEntry[]> {
  try {
    const movements = (await ctx.call("stock.movement.list", {
      siteCode: params.siteCode,
      accessToken: params.accessToken,
      limit: 500
    })) as StockMovement[];

    const extraRefs = [params.orderNumber].filter(Boolean) as string[];

    return movements
      .filter((movement) =>
        matchesStockDocumentRef(movement.documentRef, params.lotId, params.ofId, extraRefs)
      )
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

async function fetchShipmentHistory(
  ctx: Context,
  params: {
    siteCode: string;
    ofId: string;
    orderNumber?: string;
    accessToken?: string;
  }
): Promise<TimelineEntry[]> {
  try {
    const result = (await ctx.call("shipment.shipment.history", {
      siteCode: params.siteCode,
      orderNumber: params.orderNumber,
      ofId: params.ofId,
      accessToken: params.accessToken,
      page: 1,
      pageSize: 100
    })) as { items: ShipmentHistoryItem[] };

    return result.items.map((item) => ({
      timestamp: toIso(item.createdAt),
      source: "shipment",
      type: "shipment.shipment",
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
        source: "shipment",
        type: "shipment.unavailable",
        label: "Shipment service unavailable",
        status: "unavailable"
      }
    ];
  }
}

async function fetchProductionHistory(
  ctx: Context,
  params: { lotId: string; ofId: string; accessToken?: string }
): Promise<TimelineEntry[]> {
  const batchCodes = [...new Set([params.lotId, params.ofId].filter(Boolean))];

  for (const batchCode of batchCodes) {
    if (!batchCode.startsWith("BATCH-")) {
      continue;
    }
    try {
      const result = (await ctx.call("production.batch.history", {
        batch_code: batchCode,
        accessToken: params.accessToken,
        limit: 100
      })) as { items: BatchHistoryItem[] };

      if (result.items.length > 0) {
        return result.items.map((item) => ({
          timestamp: toIso(item.createdAt),
          source: "production",
          type: `production.${item.action}`,
          label: item.details || item.action,
          status: "ok" as const,
          payload: {
            batchCode,
            action: item.action,
            details: item.details
          }
        }));
      }
    } catch {
      // try next code
    }
  }

  return [
    {
      timestamp: new Date().toISOString(),
      source: "production",
      type: "production.unavailable",
      label: "Production service unavailable",
      status: "unavailable"
    }
  ];
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

async function resolveLotRecord(db: Db, key: string): Promise<LotProgressDocument> {
  const existing = await findLotProgress(db, key);
  if (existing) {
    return existing;
  }

  const identity = parseLotTraceKey(key);
  throw createError("NOT_FOUND", `Lot trace not found: ${identity.lotId}`);
}

export async function buildLotTrace(
  db: Db,
  ctx: Context,
  lotId: string,
  accessToken?: string
) {
  const lot = await resolveLotRecord(db, lotId);

  const events = await db
    .collection<EventHistoryDocument>(COLLECTIONS.eventHistory)
    .find({ $or: [{ lotId: lot.lotId }, { ofId: lot.ofId }] })
    .sort({ timestamp: 1 })
    .toArray();

  const orderNumber =
    orderNumberFromOfId(lot.ofId) ??
    (events.find((e) => typeof e.payload?.orderNumber === "string")?.payload
      ?.orderNumber as string | undefined);

  const [stockEntries, shipmentEntries, productionEntries] = await Promise.all([
    fetchStockMovements(ctx, {
      siteCode: lot.siteCode,
      lotId: lot.lotId,
      ofId: lot.ofId,
      orderNumber: orderNumber,
      accessToken
    }),
    fetchShipmentHistory(ctx, {
      siteCode: lot.siteCode,
      ofId: lot.ofId,
      orderNumber: orderNumber,
      accessToken
    }),
    fetchProductionHistory(ctx, {
      lotId: lot.lotId,
      ofId: lot.ofId,
      accessToken
    })
  ]);

  const timeline = [
    ...mapEventHistory(events),
    ...stockEntries,
    ...shipmentEntries,
    ...productionEntries
  ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

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
