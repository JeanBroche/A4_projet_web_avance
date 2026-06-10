import { getRedisClient } from "./client.js";
import type { CacheOptions } from "./types.js";

function buildCacheKey(namespace: string, keyParts: Record<string, unknown>): string {
  const parts = Object.entries(keyParts)
    .filter(([key]) => key !== "accessToken")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value ?? "_"}`)
    .join("|");
  return `${namespace}:${parts}`;
}

export async function withCache<T>(
  options: CacheOptions,
  compute: () => Promise<T>
): Promise<T> {
  const client = getRedisClient(options.logger);
  if (!client) {
    return compute();
  }

  const key = buildCacheKey(options.namespace, options.keyParts);
  const ttlSeconds = options.ttlSeconds ?? 300;

  try {
    const cached = await client.get(key);
    if (cached) {
      return JSON.parse(cached) as T;
    }
  } catch (error) {
    options.logger?.warn("redis.cache.read_failed", {
      key,
      message: error instanceof Error ? error.message : String(error)
    });
  }

  const value = await compute();

  try {
    await client.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch (error) {
    options.logger?.warn("redis.cache.write_failed", {
      key,
      message: error instanceof Error ? error.message : String(error)
    });
  }

  return value;
}
