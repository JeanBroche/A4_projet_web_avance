import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { movementListSchema } from "../src/lib/schemas.js";

describe("stock schemas", () => {
  it("movementListSchema coerces query-string limit and offset", () => {
    const parsed = movementListSchema.parse({
      materialId: "cltest123",
      siteCode: "SITE-LYO",
      limit: "50",
      offset: "0"
    });
    assert.equal(parsed.limit, 50);
    assert.equal(parsed.offset, 0);
  });
});
