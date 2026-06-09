import type { Service } from "moleculer";
import { Redis } from "ioredis";

type RedisClient = InstanceType<typeof Redis>;

const TTL_SECONDS = 300;
let redisClient: RedisClient | null = null;
let redisDisabled = false;

function getRedis(service: Service): RedisClient | null {
  if (redisDisabled) {
    return null;
  }
  if (redisClient) {
    return redisClient;
  }
  const url = process.env.REDIS_URL;
  if (!url) {
    redisDisabled = true;
    return null;
  }
  try {
    redisClient = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false
    });
    redisClient.on("error", (error: Error) => {
      service.logger.warn("reporting.cache.redis_error", { message: error.message });
      redisDisabled = true;
      redisClient?.disconnect();
      redisClient = null;
    });
    return redisClient;
  } catch (error) {
    service.logger.warn("reporting.cache.init_failed", {
      message: error instanceof Error ? error.message : String(error)
    });
    redisDisabled = true;
    return null;
  }
}

function buildKey(action: string, params: Record<string, unknown>): string {
  const parts = Object.entries(params)
    .filter(([key]) => key !== "accessToken")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value ?? "_"}`)
    .join("|");
  return `reporting:${action}:${parts}`;
}

export async function withCache<T>(
  service: Service,
  action: string,
  params: Record<string, unknown>,
  compute: () => Promise<T>
): Promise<T> {
  const client = getRedis(service);
  if (!client) {
    return compute();
  }
  const key = buildKey(action, params);
  try {
    const cached = await client.get(key);
    if (cached) {
      return JSON.parse(cached) as T;
    }
  } catch (error) {
    service.logger.warn("reporting.cache.read_failed", {
      key,
      message: error instanceof Error ? error.message : String(error)
    });
  }

  const value = await compute();

  try {
    await client.set(key, JSON.stringify(value), "EX", TTL_SECONDS);
  } catch (error) {
    service.logger.warn("reporting.cache.write_failed", {
      key,
      message: error instanceof Error ? error.message : String(error)
    });
  }

  return value;
}
