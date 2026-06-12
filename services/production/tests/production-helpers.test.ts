import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PROD_STATUSES, resolveBatchStatusFromBoms } from "../src/lib/production-helpers.js";

describe("resolveBatchStatusFromBoms", () => {
  it("returns PENDING when no OF statuses", () => {
    assert.equal(resolveBatchStatusFromBoms([]), PROD_STATUSES.PENDING);
  });

  it("returns COMPLETED when all OF are completed", () => {
    assert.equal(
      resolveBatchStatusFromBoms([
        PROD_STATUSES.COMPLETED,
        PROD_STATUSES.COMPLETED
      ]),
      PROD_STATUSES.COMPLETED
    );
  });

  it("returns IN_PROGRESS when any OF is in progress", () => {
    assert.equal(
      resolveBatchStatusFromBoms([
        PROD_STATUSES.PENDING,
        PROD_STATUSES.IN_PROGRESS
      ]),
      PROD_STATUSES.IN_PROGRESS
    );
  });

  it("returns IN_PROGRESS for mixed pending and completed", () => {
    assert.equal(
      resolveBatchStatusFromBoms([
        PROD_STATUSES.PENDING,
        PROD_STATUSES.COMPLETED
      ]),
      PROD_STATUSES.IN_PROGRESS
    );
  });

  it("returns PENDING when all OF are pending", () => {
    assert.equal(
      resolveBatchStatusFromBoms([
        PROD_STATUSES.PENDING,
        PROD_STATUSES.PENDING
      ]),
      PROD_STATUSES.PENDING
    );
  });
});
