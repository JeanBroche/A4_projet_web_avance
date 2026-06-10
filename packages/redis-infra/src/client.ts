import { Redis } from "ioredis";

import type { RedisClient, RedisLogger } from "./types.js";

let redisClient: RedisClient | null = null;
let redisDisabled = false;

export function resetRedisClient(): void {
  if (redisClient) {
    redisClient.disconnect();
  }
  redisClient = null;
  redisDisabled = false;
}

export function getRedisClient(logger?: RedisLogger): RedisClient | null {
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
      logger?.warn("redis.client.error", { message: error.message });
      redisDisabled = true;
      redisClient?.disconnect();
      redisClient = null;
    });
    return redisClient;
  } catch (error) {
    logger?.warn("redis.client.init_failed", {
      message: error instanceof Error ? error.message : String(error)
    });
    redisDisabled = true;
    return null;
  }
}
