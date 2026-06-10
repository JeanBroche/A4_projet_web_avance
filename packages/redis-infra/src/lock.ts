import { randomBytes } from "node:crypto";

import { getRedisClient } from "./client.js";
import type { LockOptions } from "./types.js";

const RELEASE_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class LockTimeoutError extends Error {
  constructor(key: string) {
    super(`Failed to acquire lock: ${key}`);
    this.name = "LockTimeoutError";
  }
}

export async function withDistributedLock<T>(
  options: LockOptions,
  fn: () => Promise<T>
): Promise<T> {
  const client = getRedisClient(options.logger);
  if (!client) {
    options.logger?.warn("redis.lock.unavailable", { key: options.key });
    return fn();
  }

  const ttlMs = options.ttlMs ?? 10_000;
  const retries = options.retries ?? 5;
  const retryDelayMs = options.retryDelayMs ?? 50;
  const token = randomBytes(16).toString("hex");

  let acquired = false;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const result = await client.set(options.key, token, "PX", ttlMs, "NX");
    if (result === "OK") {
      acquired = true;
      break;
    }
    if (attempt < retries) {
      await sleep(retryDelayMs);
    }
  }

  if (!acquired) {
    throw new LockTimeoutError(options.key);
  }

  try {
    return await fn();
  } finally {
    try {
      await client.eval(RELEASE_SCRIPT, 1, options.key, token);
    } catch (error) {
      options.logger?.warn("redis.lock.release_failed", {
        key: options.key,
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }
}
