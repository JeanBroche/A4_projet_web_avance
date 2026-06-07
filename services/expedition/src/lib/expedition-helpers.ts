import type { Context } from "moleculer";
import type { PickList, PickListLine, Shipment, ShipmentTrackingEvent } from "../generated/prisma/client.js";
import { prisma } from "../db.js";
import { createError } from "./errors.js";
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

const ALLOWED_SHIPMENT_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  PLANNED: ["PICKED", "CANCELLED"],
  PICKED: ["IN_TRANSIT", "CANCELLED"],
  IN_TRANSIT: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: []
};

type DbClient = Pick<
  typeof prisma,
  "pickList" | "shipment" | "shipmentTrackingEvent"
>;

export type PickListWithLines = PickList & { lines: PickListLine[] };
export type ShipmentWithRelations = Shipment & {
  trackingEvents?: ShipmentTrackingEvent[];
  pickList?: PickListWithLines | null;
};

export function assertSiteAccess(jwtSiteId: string | null | undefined, resourceSiteCode: string) {
  if (jwtSiteId && jwtSiteId !== resourceSiteCode) {
    throw createError("FORBIDDEN", "Resource belongs to a different site");
  }
}

export function resolveSiteCode(params: { siteCode?: string; siteId?: string }) {
  return params.siteCode || params.siteId || null;
}

export function assertShipmentTransition(current: string, next: ShipmentStatus) {
  const allowed = ALLOWED_SHIPMENT_TRANSITIONS[current as ShipmentStatus] || [];
  if (!allowed.includes(next)) {
    throw createError(
      "INVALID_STATUS_TRANSITION",
      `${current} → ${next} not allowed`
    );
  }
}

export async function generatePickListCode(db: DbClient, year = new Date().getFullYear()) {
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
}

export async function generateShipmentCode(db: DbClient, year = new Date().getFullYear()) {
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

  if (!shipment) {
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
    lines: pickList.lines.map((line) => ({
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
    plannedShipDate: shipment.plannedShipDate,
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

  try {
    const result = (await (ctx as Context & {
      call: <T>(action: string, params?: Record<string, unknown>) => Promise<T>;
    }).call<StockReservationListResult>("stock.reservation.list", {
      ofId: params.ofId,
      siteCode: params.siteCode,
      status: "ACTIVE",
      accessToken: params.accessToken
    })) as StockReservationListResult;

    const active = (result.reservations || []).filter((r) => r.status === "ACTIVE");
    if (active.length === 0) {
      throw createError("STOCK_RESERVATION_MISSING");
    }
  } catch (error) {
    const err = error as { code?: number | string; type?: string };
    if (
      err.code === 404 ||
      err.code === 501 ||
      err.type === "SERVICE_NOT_FOUND" ||
      err.type === "SERVICE_NOT_AVAILABLE"
    ) {
      return;
    }
    throw error;
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
