import type { Client, CustomerOrder, CustomerOrderLine } from "../generated/prisma/client.js";
import { prisma } from "../db.js";
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

export function assertStatusTransition(currentStatus: string, nextStatus: string) {
  if (currentStatus === ORDER_STATUSES.DRAFT) {
    if (
      nextStatus === ORDER_STATUSES.VALIDATED ||
      nextStatus === ORDER_STATUSES.REJECTED
    ) {
      return;
    }
  }

  throw createError(
    "INVALID_STATUS_TRANSITION",
    `Cannot transition from ${currentStatus} to ${nextStatus}`
  );
}

export function computeDelayRisk(order: OrderWithRelations) {
  const factors: string[] = [];
  let score = 0;
  const now = new Date();

  if (TERMINAL_STATUSES.has(order.status)) {
    return { score: 0, factors: ["Order is in a terminal status"] };
  }

  if (order.isUrgent) {
    score += 25;
    factors.push("Order marked as urgent");
  }

  const referenceDate = order.dueDate || order.promisedDeliveryDate;

  if (referenceDate) {
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysRemaining = Math.ceil((referenceDate.getTime() - now.getTime()) / msPerDay);

    if (daysRemaining < 0) {
      score += 60;
      factors.push(`Delivery date exceeded by ${Math.abs(daysRemaining)} day(s)`);
    } else if (daysRemaining <= 3) {
      score += 45;
      factors.push(`Only ${daysRemaining} day(s) until promised delivery`);
    } else if (daysRemaining <= 7) {
      score += 25;
      factors.push(`${daysRemaining} day(s) until promised delivery`);
    } else {
      score += 5;
      factors.push(`${daysRemaining} day(s) until promised delivery`);
    }
  } else {
    score += 10;
    factors.push("No promised delivery date set");
  }

  if (order.status === ORDER_STATUSES.DRAFT) {
    score += 15;
    factors.push("Order not yet validated");
  }

  const linesWithOf = (order.lines || []).filter((line: CustomerOrderLine) => line.ofId);
  if (linesWithOf.length > 0) {
    factors.push(
      `${linesWithOf.length} line(s) linked to production OF (M3 enrichment pending)`
    );
  }

  return {
    score: Math.min(100, score),
    factors,
    daysRemaining: referenceDate
      ? Math.ceil((referenceDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null
  };
}

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
