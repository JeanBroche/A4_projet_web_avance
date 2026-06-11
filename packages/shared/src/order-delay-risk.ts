const TERMINAL_STATUSES = new Set(["REJECTED", "DELIVERED"]);
const DRAFT_STATUS = "DRAFT";
const MS_PER_DAY = 1000 * 60 * 60 * 24;

export type DelayRiskOrderInput = {
  status: string;
  isUrgent: boolean;
  dueDate?: Date | string | null;
  promisedDeliveryDate?: Date | string | null;
  lines?: Array<{ ofId?: string | null }>;
};

/** Score minimum pour qu'une commande soit comptée « à risque de retard » (reporting). */
export const DEFAULT_DELAY_RISK_THRESHOLD = 45;

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  return value instanceof Date ? value : new Date(value);
}

export function computeDelayRisk(order: DelayRiskOrderInput, now = new Date()) {
  const factors: string[] = [];
  let score = 0;

  if (TERMINAL_STATUSES.has(order.status)) {
    return { score: 0, factors: ["Order is in a terminal status"], daysRemaining: null };
  }

  if (order.isUrgent) {
    score += 25;
    factors.push("Order marked as urgent");
  }

  const referenceDate = toDate(order.dueDate) ?? toDate(order.promisedDeliveryDate);

  if (referenceDate) {
    const daysRemaining = Math.ceil((referenceDate.getTime() - now.getTime()) / MS_PER_DAY);

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

  if (order.status === DRAFT_STATUS) {
    score += 15;
    factors.push("Order not yet validated");
  }

  const linesWithOf = (order.lines ?? []).filter((line) => line.ofId);
  if (linesWithOf.length > 0) {
    factors.push(
      `${linesWithOf.length} line(s) linked to production OF (M3 enrichment pending)`
    );
  }

  return {
    score: Math.min(100, score),
    factors,
    daysRemaining: referenceDate
      ? Math.ceil((referenceDate.getTime() - now.getTime()) / MS_PER_DAY)
      : null
  };
}
