import type { Client, CustomerOrder, CustomerOrderLine } from "../generated/prisma/client.js";
import { withDistributedLock } from "@aeronexis/redis-infra";
import { prisma } from "../db.js";
import { resolveOfId, computeDelayRisk } from "@aeronexis/shared";
import { createError } from "@aeronexis/services-shared";

export const ORDER_STATUSES = {
  DRAFT: "DRAFT",
  VALIDATED: "VALIDATED",
  REJECTED: "REJECTED",
  IN_PRODUCTION: "IN_PRODUCTION",
  SHIPPED: "SHIPPED",
  DELIVERED: "DELIVERED"
} as const;

export const VALIDATION_ACTIONS = {
  VALIDATE: "VALIDATE",
  REJECT: "REJECT"
} as const;

const TERMINAL_STATUSES = new Set<string>([
  ORDER_STATUSES.REJECTED,
  ORDER_STATUSES.DELIVERED
]);

type DbClient = Pick<typeof prisma, "customerOrder" | "client">;

export type OrderWithRelations = CustomerOrder & {
  client?: Client | null;
  lines?: CustomerOrderLine[];
};

export async function generateOrderNumber(db: DbClient, year = new Date().getFullYear()) {
  return withDistributedLock({ key: `lock:code:order:${year}` }, async () => {
    const prefix = `CMD-${year}-`;

    const latest = await db.customerOrder.findFirst({
      where: {
        orderNumber: { startsWith: prefix },
        deletedAt: null
      },
      orderBy: { orderNumber: "desc" },
      select: { orderNumber: true }
    });

    let sequence = 1;

    if (latest?.orderNumber) {
      const suffix = latest.orderNumber.slice(prefix.length);
      const parsed = Number.parseInt(suffix, 10);
      if (!Number.isNaN(parsed)) {
        sequence = parsed + 1;
      }
    }

    return `${prefix}${String(sequence).padStart(5, "0")}`;
  });
}

export function toOrderSummary(order: OrderWithRelations) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    clientId: order.clientId,
    siteCode: order.siteCode,
    status: order.status,
    isUrgent: order.isUrgent,
    dueDate: order.dueDate ?? null,
    promisedDeliveryDate: order.promisedDeliveryDate ?? null,
    totalAmount: order.totalAmount,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    client: order.client
      ? {
          id: order.client.id,
          code: order.client.code,
          name: order.client.name
        }
      : undefined,
    lines: order.lines
      ? order.lines.map((line: CustomerOrderLine) => ({
          id: line.id,
          lineNumber: line.lineNumber,
          productCode: line.productCode,
          description: line.description ?? null,
          quantity: line.quantity,
          unitPrice: line.unitPrice ?? null,
          ofId: line.ofId ?? null
        }))
      : undefined
  };
}

export function computeTotalAmount(lines: { unitPrice?: number; quantity: number }[]) {
  return lines.reduce((sum, line) => {
    const unitPrice = line.unitPrice ?? 0;
    return sum + unitPrice * line.quantity;
  }, 0);
}

export async function loadActiveOrder(db: DbClient, orderId: string) {
  const order = await db.customerOrder.findFirst({
    where: { id: orderId, deletedAt: null },
    include: {
      client: true,
      lines: {
        where: { deletedAt: null },
        orderBy: { lineNumber: "asc" }
      }
    }
  });

  if (!order) {
    throw createError("NOT_FOUND", `Order not found: ${orderId}`);
  }

  return order;
}

export async function loadActiveClient(db: DbClient, clientId: string) {
  const client = await db.client.findFirst({
    where: { id: clientId, deletedAt: null, status: "active" }
  });

  if (!client) {
    throw createError("NOT_FOUND", `Client not found or inactive: ${clientId}`);
  }

  return client;
}

const ALLOWED_STATUS_TRANSITIONS: Record<string, readonly string[]> = {
  [ORDER_STATUSES.DRAFT]: [ORDER_STATUSES.VALIDATED, ORDER_STATUSES.REJECTED],
  [ORDER_STATUSES.VALIDATED]: [ORDER_STATUSES.IN_PRODUCTION],
  [ORDER_STATUSES.IN_PRODUCTION]: [ORDER_STATUSES.SHIPPED],
  [ORDER_STATUSES.SHIPPED]: [ORDER_STATUSES.DELIVERED]
};

/** Statuts modifiables manuellement depuis l'UI commerciale (hors workflow production). */
export const MANUAL_LOGISTICS_STATUSES = new Set<string>([
  ORDER_STATUSES.VALIDATED,
  ORDER_STATUSES.IN_PRODUCTION,
  ORDER_STATUSES.SHIPPED,
  ORDER_STATUSES.DELIVERED
]);

export const UI_LOGISTICS_STATUS = {
  PREPARED: "prepared",
  SHIPPED: "shipped",
  DELIVERED: "delivered"
} as const;

export type UiLogisticsStatus =
  (typeof UI_LOGISTICS_STATUS)[keyof typeof UI_LOGISTICS_STATUS];

export function mapUiLogisticsToOrderStatus(status: UiLogisticsStatus): string {
  switch (status) {
    case UI_LOGISTICS_STATUS.PREPARED:
      return ORDER_STATUSES.VALIDATED;
    case UI_LOGISTICS_STATUS.SHIPPED:
      return ORDER_STATUSES.SHIPPED;
    case UI_LOGISTICS_STATUS.DELIVERED:
      return ORDER_STATUSES.DELIVERED;
    default:
      throw createError("VALIDATION_ERROR", `Unknown logistics status: ${status}`);
  }
}

export function assertManualLogisticsTransition(currentStatus: string, nextStatus: string) {
  if (!MANUAL_LOGISTICS_STATUSES.has(currentStatus)) {
    throw createError(
      "ORDER_INVALID_STATUS_TRANSITION",
      `Le statut logistique ne peut pas être modifié depuis ${currentStatus}`
    );
  }

  if (!MANUAL_LOGISTICS_STATUSES.has(nextStatus)) {
    throw createError(
      "ORDER_INVALID_STATUS_TRANSITION",
      `Le statut logistique cible ${nextStatus} n'est pas autorisé`
    );
  }
}

export function assertStatusTransition(currentStatus: string, nextStatus: string) {
  const allowed = ALLOWED_STATUS_TRANSITIONS[currentStatus];
  if (allowed?.includes(nextStatus)) {
    return;
  }

  throw createError(
    "ORDER_INVALID_STATUS_TRANSITION",
    `Cannot transition from ${currentStatus} to ${nextStatus}`
  );
}

export type OrderFinishedPayload = {
  orderNumber: string;
  siteCode: string;
  clientCode?: string;
  ofId?: string;
  lines: Array<{ lineNumber: number; productCode: string; quantity: number }>;
};

export function buildOrderFinishedPayload(order: OrderWithRelations): OrderFinishedPayload {
  const lines = order.lines ?? [];
  const batchOfId = lines.find((line) => line.ofId && line.ofId.startsWith("BATCH-"))?.ofId;
  const ofId = resolveOfId(batchOfId, order.orderNumber);

  return {
    orderNumber: order.orderNumber,
    siteCode: order.siteCode,
    clientCode: order.client?.code,
    ofId,
    lines: lines.map((line) => ({
      lineNumber: line.lineNumber,
      productCode: line.productCode,
      quantity: line.quantity
    }))
  };
}

type OrderTxClient = typeof prisma;

export async function applyOrderStatusTransition(
  db: OrderTxClient,
  order: OrderWithRelations,
  nextStatus: string,
  changedBy: string,
  notes?: string,
  options?: { manual?: boolean }
) {
  if (options?.manual) {
    assertManualLogisticsTransition(order.status, nextStatus);
  } else {
    assertStatusTransition(order.status, nextStatus);
  }

  return db.$transaction(async (tx) => {
    const updated = await tx.customerOrder.update({
      where: { id: order.id },
      data: { status: nextStatus },
      include: {
        client: true,
        lines: { where: { deletedAt: null }, orderBy: { lineNumber: "asc" } }
      }
    });

    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        fromStatus: order.status,
        toStatus: nextStatus,
        changedBy,
        notes
      }
    });

    return updated;
  });
}

export { computeDelayRisk } from "@aeronexis/shared";

export function computeClientStats(orders: CustomerOrder[]) {
  const deliveredOrders = orders.filter((o) => o.status === ORDER_STATUSES.DELIVERED);
  const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  let averageLeadTimeDays: number | null = null;

  if (deliveredOrders.length > 0) {
    const leadTimes = deliveredOrders
      .filter((o) => o.promisedDeliveryDate)
      .map((o) => {
        const diff = o.updatedAt.getTime() - o.createdAt.getTime();
        return diff / (1000 * 60 * 60 * 24);
      });

    if (leadTimes.length > 0) {
      averageLeadTimeDays =
        Math.round((leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length) * 10) / 10;
    }
  }

  return {
    orderCount: orders.length,
    totalRevenue,
    urgentCount: orders.filter((o) => o.isUrgent).length,
    byStatus: orders.reduce<Record<string, number>>((acc, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    }, {}),
    averageLeadTimeDays
  };
}
