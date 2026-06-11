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

export async function ensureRedisConnected(redis: RedisClient): Promise<void> {
  if (redis.status === "ready") {
    return;
  }
  if (redis.status === "connecting") {
    await new Promise<void>((resolve, reject) => {
      const onReady = () => {
        cleanup();
        resolve();
      };
      const onError = (error: Error) => {
        cleanup();
        reject(error);
      };
      const cleanup = () => {
        redis.off("ready", onReady);
        redis.off("error", onError);
      };
      redis.once("ready", onReady);
      redis.once("error", onError);
    });
    return;
  }
  await redis.connect();
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
