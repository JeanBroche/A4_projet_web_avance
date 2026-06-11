import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getErrorCode } from "../src/errorUtils.js";
import {
  registerJwtBlacklistChecker,
  signAccessToken,
  verifyAccessTokenWithBlacklist
} from "../src/jwtUtils.js";
import {
  failureResponse,
  isFailureEnvelope,
  isSuccessEnvelope,
  successResponse,
  unwrapResponse
} from "../src/responseUtils.js";

describe("responseUtils", () => {
  it("wraps and unwraps success payloads", () => {
    const wrapped = successResponse({ ok: true }, { correlationId: "abc" });
    assert.equal(wrapped.status, "success");
    assert.deepEqual(unwrapResponse(wrapped), { ok: true });
    assert.ok(isSuccessEnvelope(wrapped));
  });

  it("wraps failure payloads", () => {
    const wrapped = failureResponse(
      { code: "NOT_FOUND", message: "Missing" },
      { correlationId: "abc" }
    );
    assert.equal(wrapped.status, "failure");
    assert.ok(isFailureEnvelope(wrapped));
  });
});

describe("jwtUtils blacklist", () => {
  it("rejects blacklisted jti", async () => {
    process.env.JWT_SECRET ??= "test-secret";
    registerJwtBlacklistChecker(async (jti) => jti === "blocked-jti");

    const token = signAccessToken({
      sub: "user-1",
      email: "u@test.local",
      siteId: "SITE-LYO",
      roles: ["admin"]
    });

    await verifyAccessTokenWithBlacklist(token);

    const decoded = JSON.parse(
      Buffer.from(token.split(".")[1]!, "base64url").toString("utf8")
    ) as { jti?: string };

    registerJwtBlacklistChecker(async (jti) => jti === decoded.jti);

    await assert.rejects(
      () => verifyAccessTokenWithBlacklist(token),
      (error) => getErrorCode(error) === "TOKEN_INVALID"
    );

    registerJwtBlacklistChecker(null);
  });
});
