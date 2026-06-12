import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { orderHistorySchema } from "../src/lib/schemas.js";

describe("order schemas", () => {
  it("orderHistorySchema coerces query-string limit and offset", () => {
    const parsed = orderHistorySchema.parse({
      siteCode: "SITE-LYO",
      limit: "100",
      offset: "0"
    });
    assert.equal(parsed.limit, 100);
    assert.equal(parsed.offset, 0);
  });
});
