function readNumber(name: string, fallback: number) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") {
    return fallback;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export type KpiConfig = {
  /** Marge cible (0–1) pour estimer le coût à partir du CA ligne. */
  targetMarginRate: number;
  delayPenaltyBaseCentimes: number;
  delayPenaltyPerDayCentimes: number;
  /** Part du CA commande ajoutée à la pénalité par jour de retard. */
  delayPenaltyRevenueRatio: number;
  delayRiskScoreThreshold: number;
  orderPageSize: number;
  maxOrdersFetched: number;
};

export function getKpiConfig(): KpiConfig {
  return {
    targetMarginRate: readNumber("REPORTING_TARGET_MARGIN_RATE", 0.35),
    delayPenaltyBaseCentimes: readNumber("REPORTING_DELAY_PENALTY_BASE_CENTIMES", 1_000),
    delayPenaltyPerDayCentimes: readNumber("REPORTING_DELAY_PENALTY_PER_DAY_CENTIMES", 500),
    delayPenaltyRevenueRatio: readNumber("REPORTING_DELAY_PENALTY_REVENUE_RATIO", 0.002),
    delayRiskScoreThreshold: readNumber(
      "REPORTING_DELAY_RISK_SCORE_THRESHOLD",
      45
    ),
    orderPageSize: readNumber("REPORTING_ORDER_PAGE_SIZE", 100),
    maxOrdersFetched: readNumber("REPORTING_MAX_ORDERS_FETCHED", 5_000)
  };
}
