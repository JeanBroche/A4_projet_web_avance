import { computeDelayRisk } from "@aeronexis/shared";
import type { KpiConfig } from "./kpi-config.js";
import type { ReportingOrderSummary } from "./order-fetch.js";

const ACTIVE_STATUSES = new Set(["DRAFT", "VALIDATED", "IN_PRODUCTION", "SHIPPED"]);
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  return value instanceof Date ? value : new Date(value);
}

export function estimateOrderRevenue(order: ReportingOrderSummary): number {
  if (order.lines?.length) {
    const fromLines = order.lines.reduce(
      (sum, line) => sum + (line.unitPrice ?? 0) * line.quantity,
      0
    );
    if (fromLines > 0) {
      return fromLines;
    }
  }
  return order.totalAmount || 0;
}

export function estimateOrderCost(revenue: number, config: KpiConfig): number {
  const costRatio = 1 - config.targetMarginRate;
  return Math.round(revenue * costRatio);
}

export function countDaysLate(order: ReportingOrderSummary, now: Date): number {
  const referenceDate = toDate(order.dueDate) ?? toDate(order.promisedDeliveryDate);
  if (!referenceDate) {
    return 0;
  }
  const diff = now.getTime() - referenceDate.getTime();
  if (diff <= 0) {
    return 0;
  }
  return Math.ceil(diff / MS_PER_DAY);
}

export function estimateDelayPenalty(
  order: ReportingOrderSummary,
  now: Date,
  config: KpiConfig
): number {
  const daysLate = countDaysLate(order, now);
  if (daysLate <= 0) {
    return 0;
  }
  const revenue = estimateOrderRevenue(order);
  return Math.round(
    config.delayPenaltyBaseCentimes +
      daysLate * config.delayPenaltyPerDayCentimes +
      revenue * config.delayPenaltyRevenueRatio
  );
}

export function isActiveOrder(status: string) {
  return ACTIVE_STATUSES.has(status);
}

export function assessDelayRisk(order: ReportingOrderSummary, now: Date) {
  return computeDelayRisk(
    {
      status: order.status,
      isUrgent: order.isUrgent,
      dueDate: order.dueDate,
      promisedDeliveryDate: order.promisedDeliveryDate,
      lines: order.lines
    },
    now
  );
}
