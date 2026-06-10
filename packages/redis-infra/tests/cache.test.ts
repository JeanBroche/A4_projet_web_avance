import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";

import { Redis } from "ioredis";

import { withCache } from "../src/cache.js";
import { resetRedisClient } from "../src/client.js";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

describe("withCache", () => {
  let redis: Redis;
  let available = false;

  before(async () => {
    resetRedisClient();
    process.env.REDIS_URL = REDIS_URL;
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
      const keys = await redis.keys("test-cache:*");
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    }
    await redis.quit();
    resetRedisClient();
  });

  it("caches computed values", async (t) => {
    if (!available) {
      t.skip("Redis unavailable");
      return;
    }

    let calls = 0;
    const compute = async () => {
      calls += 1;
      return { value: 42 };
    };

    const options = { namespace: "test-cache", keyParts: { action: "demo" } };
    const first = await withCache(options, compute);
    const second = await withCache(options, compute);

    assert.equal(first.value, 42);
    assert.equal(second.value, 42);
    assert.equal(calls, 1);
  });
});
