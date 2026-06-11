import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assessDelayRisk,
  countDaysLate,
  estimateDelayPenalty,
  estimateOrderCost,
  estimateOrderRevenue
} from "../src/lib/kpi-estimates.js";
import { getKpiConfig } from "../src/lib/kpi-config.js";

const NOW = new Date("2026-06-09T12:00:00Z");
const dayMs = 24 * 60 * 60 * 1000;

describe("kpi-estimates", () => {
  it("estimateOrderRevenue prefers line totals over order totalAmount", () => {
    const revenue = estimateOrderRevenue({
      id: "1",
      orderNumber: "CMD-1",
      status: "VALIDATED",
      isUrgent: false,
      totalAmount: 10_000,
      createdAt: NOW,
      lines: [{ quantity: 2, unitPrice: 60_000 }]
    });
    assert.equal(revenue, 120_000);
  });

  it("computeDelayRisk uses promisedDeliveryDate when dueDate is absent", () => {
    const risk = assessDelayRisk(
      {
        id: "1",
        orderNumber: "CMD-1",
        status: "VALIDATED",
        isUrgent: false,
        totalAmount: 0,
        dueDate: null,
        promisedDeliveryDate: new Date(NOW.getTime() - 2 * dayMs),
        createdAt: NOW
      },
      NOW
    );
    assert.ok(risk.score >= 60);
    assert.ok(risk.factors.some((f) => f.includes("exceeded")));
  });

  it("estimateDelayPenalty scales with days late and revenue", () => {
    const config = getKpiConfig();
    const penalty = estimateDelayPenalty(
      {
        id: "1",
        orderNumber: "CMD-1",
        status: "VALIDATED",
        isUrgent: false,
        totalAmount: 100_000,
        dueDate: new Date(NOW.getTime() - 3 * dayMs),
        createdAt: NOW
      },
      NOW,
      config
    );
    assert.equal(countDaysLate(
      {
        id: "1",
        orderNumber: "CMD-1",
        status: "VALIDATED",
        isUrgent: false,
        totalAmount: 100_000,
        dueDate: new Date(NOW.getTime() - 3 * dayMs),
        createdAt: NOW
      },
      NOW
    ), 3);
    assert.equal(
      penalty,
      Math.round(
        config.delayPenaltyBaseCentimes +
          3 * config.delayPenaltyPerDayCentimes +
          100_000 * config.delayPenaltyRevenueRatio
      )
    );
  });

  it("estimateOrderCost derives cost from target margin rate", () => {
    const config = getKpiConfig();
    assert.equal(estimateOrderCost(100_000, config), Math.round(100_000 * (1 - config.targetMarginRate)));
  });
});
