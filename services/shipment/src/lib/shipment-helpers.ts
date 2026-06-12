import type { Context } from "moleculer";
import type { PickList, Shipment, ShipmentTrackingEvent } from "../generated/prisma/client.js";
import { withDistributedLock } from "@aeronexis/redis-infra";
import { prisma } from "../db.js";
import { createError } from "@aeronexis/services-shared";
import type { ShipmentStatus } from "./schemas.js";

export const PICKLIST_STATUS = {
  PENDING: "PENDING",
  COMPLETED: "COMPLETED"
} as const;

export const SHIPMENT_STATUS = {
  PLANNED: "PLANNED",
  PICKED: "PICKED",
  IN_TRANSIT: "IN_TRANSIT",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED"
} as const;

type DbClient = Pick<
  typeof prisma,
  "pickList" | "shipment" | "shipmentTrackingEvent"
>;

export type PickListLineRecord = {
  id: string;
  lineNumber: number;
  productCode: string;
  quantity: number;
  pickedQty: number;
};

export type PickListWithLines = PickList & { lines: PickListLineRecord[] };
export type ShipmentWithRelations = Shipment & {
  trackingEvents?: ShipmentTrackingEvent[];
  pickList?: PickListWithLines | null;
};

export function resolveSiteCode(params: { siteCode?: string; siteId?: string }) {
  return params.siteCode || params.siteId || null;
}

/** Manual status updates — any target status is allowed. */
export function assertShipmentTransition(_current: string, _next: ShipmentStatus) {}

export async function generatePickListCode(db: DbClient, year = new Date().getFullYear()) {
  return withDistributedLock({ key: `lock:code:pick:${year}` }, async () => {
    const prefix = `PICK-${year}-`;
    const latest = await db.pickList.findFirst({
      where: { code: { startsWith: prefix }, deletedAt: null },
      orderBy: { code: "desc" },
      select: { code: true }
    });

    let sequence = 1;
    if (latest?.code) {
      const parsed = Number.parseInt(latest.code.slice(prefix.length), 10);
      if (!Number.isNaN(parsed)) {
        sequence = parsed + 1;
      }
    }

    return `${prefix}${String(sequence).padStart(5, "0")}`;
  });
}

export async function generateShipmentCode(db: DbClient, year = new Date().getFullYear()) {
  return withDistributedLock({ key: `lock:code:ship:${year}` }, async () => {
    const prefix = `SHP-${year}-`;
    const latest = await db.shipment.findFirst({
      where: { code: { startsWith: prefix }, deletedAt: null },
      orderBy: { code: "desc" },
      select: { code: true }
    });

    let sequence = 1;
    if (latest?.code) {
      const parsed = Number.parseInt(latest.code.slice(prefix.length), 10);
      if (!Number.isNaN(parsed)) {
        sequence = parsed + 1;
      }
    }

    return `${prefix}${String(sequence).padStart(5, "0")}`;
  });
}

export async function loadActivePickList(id: string): Promise<PickListWithLines> {
  const pickList = await prisma.pickList.findUnique({
    where: { id },
    include: { lines: { orderBy: { lineNumber: "asc" } } }
  });

  if (!pickList) {
    throw createError("PICKLIST_NOT_FOUND");
  }

  return pickList;
}

export async function loadActiveShipment(id: string): Promise<ShipmentWithRelations> {
  const shipment = await prisma.shipment.findUnique({
    where: { id },
    include: {
      trackingEvents: { orderBy: { createdAt: "asc" } },
      pickList: { include: { lines: { orderBy: { lineNumber: "asc" } } } }
    }
  });

  if (!shipment || shipment.deletedAt) {
    throw createError("SHIPMENT_NOT_FOUND");
  }

  return shipment;
}

export function toPickListSummary(pickList: PickListWithLines) {
  return {
    id: pickList.id,
    code: pickList.code,
    orderNumber: pickList.orderNumber,
    ofId: pickList.ofId,
    clientCode: pickList.clientCode,
    siteCode: pickList.siteCode,
    status: pickList.status,
    createdAt: pickList.createdAt,
    updatedAt: pickList.updatedAt,
    lines: pickList.lines.map((line: PickListLineRecord) => ({
      id: line.id,
      lineNumber: line.lineNumber,
      productCode: line.productCode,
      quantity: line.quantity,
      pickedQty: line.pickedQty
    }))
  };
}

export function toShipmentSummary(shipment: ShipmentWithRelations) {
  return {
    id: shipment.id,
    code: shipment.code,
    pickListId: shipment.pickListId,
    orderNumber: shipment.orderNumber,
    clientCode: shipment.clientCode,
    siteCode: shipment.siteCode,
    status: shipment.status,
    carrier: shipment.carrier,
    deliveryAddress: shipment.deliveryAddress,
    emoji: shipment.emoji,
    plannedShipDate: shipment.plannedShipDate,
    plannedDeliveryDate: shipment.plannedDeliveryDate,
    shippedAt: shipment.shippedAt,
    deliveredAt: shipment.deliveredAt,
    createdAt: shipment.createdAt,
    updatedAt: shipment.updatedAt
  };
}

export function toTrackingTimeline(events: ShipmentTrackingEvent[]) {
  return events.map((event) => ({
    id: event.id,
    fromStatus: event.fromStatus,
    toStatus: event.toStatus,
    notes: event.notes,
    createdAt: event.createdAt
  }));
}

export function buildHistoryFilter(params: {
  siteCode?: string;
  clientCode?: string;
  orderNumber?: string;
  ofId?: string;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
}) {
  const where: Record<string, unknown> = { deletedAt: null };

  if (params.siteCode) {
    where.siteCode = params.siteCode;
  }
  if (params.clientCode) {
    where.clientCode = params.clientCode;
  }
  if (params.orderNumber) {
    where.orderNumber = params.orderNumber;
  }
  if (params.ofId) {
    where.pickList = { ofId: params.ofId, deletedAt: null };
  }
  if (params.status) {
    where.status = params.status;
  }
  if (params.dateFrom || params.dateTo) {
    where.createdAt = {
      ...(params.dateFrom ? { gte: params.dateFrom } : {}),
      ...(params.dateTo ? { lte: params.dateTo } : {})
    };
  }

  return where;
}

type StockReservationListResult = {
  reservations?: Array<{ ofId: string; status: string; quantity: number }>;
};

export async function verifyStockReservations(
  ctx: Context,
  params: {
    ofId?: string | null;
    siteCode: string;
    accessToken?: string;
  }
) {
  if (!params.ofId) {
    return;
  }

  const result = await (ctx as Context & {
    call: <T>(action: string, params?: Record<string, unknown>) => Promise<T>;
  }).call<StockReservationListResult>("stock.reservation.list", {
    ofId: params.ofId,
    siteCode: params.siteCode,
    status: "ACTIVE",
    accessToken: params.accessToken
  });

  const active = (result.reservations || []).filter((r) => r.status === "ACTIVE");
  if (active.length === 0) {
    throw createError("STOCK_RESERVATION_MISSING");
  }
}

export function shipmentStatusSideEffects(status: ShipmentStatus) {
  const now = new Date();
  if (status === SHIPMENT_STATUS.IN_TRANSIT) {
    return { shippedAt: now };
  }
  if (status === SHIPMENT_STATUS.DELIVERED) {
    return { deliveredAt: now, shippedAt: now };
  }
  return {};
}
