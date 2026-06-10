import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";

import { Redis } from "ioredis";

import { createSessionStore } from "../src/sessions.js";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

describe("SessionStore", () => {
  let redis: Redis;
  let available = false;

  before(async () => {
    redis = new Redis(REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });
    try {
      await redis.connect();
      await redis.ping();
      available = true;
    } catch {
      available = false;
    }
  });

  after(async () => {
    if (available) {
      const keys = await redis.keys("test-auth:*");
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    }
    await redis.quit();
  });

  it("creates, rotates and revokes refresh tokens", async (t) => {
    if (!available) {
      t.skip("Redis unavailable");
      return;
    }

    const store = createSessionStore(redis, {
      keyPrefix: "test-auth",
      refreshTtlSeconds: 60
    });

    const created = await store.createRefreshToken("user-1");
    assert.ok(created.token);

    const rotated = await store.rotateRefreshToken(created.token);
    assert.ok(rotated);
    assert.equal(rotated.record.userId, "user-1");
    assert.notEqual(rotated.token, created.token);

    const stale = await store.rotateRefreshToken(created.token);
    assert.equal(stale, null);

    const revoked = await store.revokeRefreshToken(rotated.token);
    assert.equal(revoked, true);
  });

  it("blacklists JWT jti", async (t) => {
    if (!available) {
      t.skip("Redis unavailable");
      return;
    }

    const store = createSessionStore(redis, {
      keyPrefix: "test-auth",
      refreshTtlSeconds: 60
    });

    await store.blacklistJwt("jti-123", 30);
    assert.equal(await store.isJwtBlacklisted("jti-123"), true);
    assert.equal(await store.isJwtBlacklisted("jti-other"), false);
  });
});
