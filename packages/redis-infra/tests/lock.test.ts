import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";

import { Redis } from "ioredis";

import { withDistributedLock } from "../src/lock.js";
import { resetRedisClient } from "../src/client.js";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

describe("withDistributedLock", () => {
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
      await redis.del("test-lock:demo");
    }
    await redis.quit();
    resetRedisClient();
  });

  it("serializes concurrent access", async (t) => {
    if (!available) {
      t.skip("Redis unavailable");
      return;
    }

    let counter = 0;
    const run = () =>
      withDistributedLock({ key: "test-lock:demo", ttlMs: 5_000 }, async () => {
        const current = counter;
        await new Promise((resolve) => setTimeout(resolve, 20));
        counter = current + 1;
      });

    await Promise.all([run(), run(), run()]);
    assert.equal(counter, 3);
  });
});
