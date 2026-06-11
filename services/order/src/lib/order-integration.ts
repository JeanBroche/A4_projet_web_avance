import type { Context, Service } from "moleculer";
import { prisma } from "../db.js";
import {
  applyOrderStatusTransition,
  buildOrderFinishedPayload,
  ORDER_STATUSES,
  type OrderWithRelations
} from "./order-helpers.js";
import { DomainEvents } from "@aeronexis/shared";
import { publishOrderEvent } from "./events.js";

export type ProductionFinishedPayload = {
  batch_code: string;
  command_id: string;
  siteCode: string;
  ofId?: string;
};

export type ShipmentStatusChangedPayload = {
  id: string;
  code: string;
  orderNumber: string;
  ofId?: string | null;
  siteCode: string;
  fromStatus: string;
  toStatus: string;
};

async function loadOrderByNumber(orderNumber: string): Promise<OrderWithRelations | null> {
  return prisma.customerOrder.findFirst({
    where: { orderNumber, deletedAt: null },
    include: {
      client: true,
      lines: { where: { deletedAt: null }, orderBy: { lineNumber: "asc" } }
    }
  });
}

export async function finishOrderAndEmit(
  service: Service,
  order: OrderWithRelations,
  changedBy: string,
  notes?: string
) {
  if (order.status !== ORDER_STATUSES.IN_PRODUCTION) {
    service.logger.warn("finishOrderAndEmit skipped: invalid status", {
      orderNumber: order.orderNumber,
      status: order.status
    });
    return null;
  }

  const payload = buildOrderFinishedPayload(order);
  if (payload.lines.length === 0) {
    service.logger.warn("finishOrderAndEmit skipped: no lines", {
      orderNumber: order.orderNumber
    });
    return null;
  }

  await prisma.orderStatusHistory.create({
    data: {
      orderId: order.id,
      fromStatus: order.status,
      toStatus: order.status,
      changedBy,
      notes: notes ?? "Production finished, ready for shipment"
    }
  });

  publishOrderEvent(service, DomainEvents.order.finished, payload);
  return payload;
}

export async function handleProductionFinished(
  ctx: Context<ProductionFinishedPayload>,
  changedBy = "production"
) {
  const orderNumber = ctx.params.command_id;
  if (!orderNumber) {
    return;
  }

  const order = await loadOrderByNumber(orderNumber);
  if (!order) {
    ctx.service!.logger.warn("production.manu_order.finished: order not found", { orderNumber });
    return;
  }

  await finishOrderAndEmit(
    ctx.service!,
    order,
    changedBy,
    `Batch ${ctx.params.batch_code} completed`
  );
}

async function transitionOrderFromShipment(
  service: Service,
  order: OrderWithRelations,
  nextStatus: string,
  notes: string
) {
  const updated = await applyOrderStatusTransition(
    prisma,
    order,
    nextStatus,
    "shipment-sync",
    notes
  );

  if (nextStatus === ORDER_STATUSES.SHIPPED) {
    publishOrderEvent(service, DomainEvents.order.shipped, {
      orderId: updated.id,
      orderNumber: updated.orderNumber,
      siteCode: updated.siteCode
    });
  } else if (nextStatus === ORDER_STATUSES.DELIVERED) {
    publishOrderEvent(service, DomainEvents.order.delivered, {
      orderId: updated.id,
      orderNumber: updated.orderNumber,
      siteCode: updated.siteCode
    });
  }

  return updated;
}

export async function syncOrderFromShipmentStatus(
  service: Service,
  payload: ShipmentStatusChangedPayload
) {
  const order = await loadOrderByNumber(payload.orderNumber);
  if (!order) {
    service.logger.warn("syncOrderFromShipmentStatus: order not found", {
      orderNumber: payload.orderNumber
    });
    return;
  }

  const notes = `Auto-sync from shipment ${payload.code}`;

  if (payload.toStatus === "IN_TRANSIT" && order.status === ORDER_STATUSES.IN_PRODUCTION) {
    await transitionOrderFromShipment(service, order, ORDER_STATUSES.SHIPPED, notes);
    return;
  }

  if (payload.toStatus === "DELIVERED") {
    let current = order;
    if (current.status === ORDER_STATUSES.IN_PRODUCTION) {
      current = await transitionOrderFromShipment(
        service,
        current,
        ORDER_STATUSES.SHIPPED,
        notes
      );
    }
    if (current.status === ORDER_STATUSES.SHIPPED) {
      await transitionOrderFromShipment(service, current, ORDER_STATUSES.DELIVERED, notes);
    }
  }
}
