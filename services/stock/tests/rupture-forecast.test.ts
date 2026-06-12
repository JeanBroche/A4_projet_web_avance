import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeRuptureForecast } from "../src/lib/stock-helpers.js";

describe("computeRuptureForecast", () => {
  it("returns rupture when available is zero", () => {
    const result = computeRuptureForecast({
      available: 0,
      minimum: 5,
      totalOutInWindow: 10,
      windowDays: 30,
      activeReservationQty: 0
    });
    assert.equal(result.score, 100);
    assert.equal(result.status, "rupture");
    assert.equal(result.estimatedDaysToRupture, 0);
  });

  it("uses threshold risk when there is no consumption signal", () => {
    const result = computeRuptureForecast({
      available: 7,
      minimum: 10,
      totalOutInWindow: 0,
      windowDays: 30,
      activeReservationQty: 0
    });
    assert.ok(result.score >= 50);
    assert.equal(result.status, "warning");
    assert.equal(result.estimatedDaysToRupture, null);
  });

  it("estimates days from OUT consumption history", () => {
    const result = computeRuptureForecast({
      available: 30,
      minimum: 5,
      totalOutInWindow: 30,
      windowDays: 30,
      activeReservationQty: 0
    });
    assert.equal(result.consumptionPerDay, 1);
    assert.equal(result.estimatedDaysToRupture, 30);
    assert.ok(result.score >= 0 && result.score <= 100);
  });

  it("factors active reservations into daily pressure", () => {
    const result = computeRuptureForecast({
      available: 10,
      minimum: 2,
      totalOutInWindow: 0,
      windowDays: 30,
      activeReservationQty: 14
    });
    assert.equal(result.consumptionPerDay, 2);
    assert.equal(result.estimatedDaysToRupture, 5);
    assert.ok(result.score > 50);
  });
});
