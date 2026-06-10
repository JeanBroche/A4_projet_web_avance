import { createHash, randomBytes, randomUUID } from "node:crypto";

import type { RedisClient } from "./types.js";
import type { RefreshTokenRecord, SessionStore, SessionStoreOptions } from "./types.js";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function refreshKey(prefix: string, tokenHash: string): string {
  return `${prefix}:refresh:${tokenHash}`;
}

function userSessionsKey(prefix: string, userId: string): string {
  return `${prefix}:user:sessions:${userId}`;
}

function jwtBlacklistKey(prefix: string, jti: string): string {
  return `${prefix}:jwt:blacklist:${jti}`;
}

export function createSessionStore(
  redis: RedisClient,
  options: SessionStoreOptions
): SessionStore {
  const prefix = options.keyPrefix ?? "auth";
  const ttlSeconds = options.refreshTtlSeconds;

  async function persistToken(
    userId: string,
    tokenHash: string,
    familyId: string
  ): Promise<RefreshTokenRecord> {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    const record: RefreshTokenRecord = { userId, familyId, expiresAt };

    await redis
      .multi()
      .set(refreshKey(prefix, tokenHash), JSON.stringify(record), "EX", ttlSeconds)
      .sadd(userSessionsKey(prefix, userId), tokenHash)
      .expire(userSessionsKey(prefix, userId), ttlSeconds)
      .exec();

    return record;
  }

  return {
    async createRefreshToken(userId: string) {
      const token = randomBytes(32).toString("hex");
      const tokenHash = hashToken(token);
      const familyId = randomUUID();
      await persistToken(userId, tokenHash, familyId);
      return { token, tokenHash };
    },

    async rotateRefreshToken(token: string) {
      const tokenHash = hashToken(token);
      const raw = await redis.get(refreshKey(prefix, tokenHash));
      if (!raw) {
        return null;
      }

      const record = JSON.parse(raw) as RefreshTokenRecord;
      if (new Date(record.expiresAt) <= new Date()) {
        await redis.del(refreshKey(prefix, tokenHash));
        return null;
      }

      const newToken = randomBytes(32).toString("hex");
      const newTokenHash = hashToken(newToken);

      await redis
        .multi()
        .del(refreshKey(prefix, tokenHash))
        .srem(userSessionsKey(prefix, record.userId), tokenHash)
        .exec();

      const newRecord = await persistToken(record.userId, newTokenHash, record.familyId);

      return {
        token: newToken,
        tokenHash: newTokenHash,
        record: newRecord
      };
    },

    async revokeRefreshToken(token: string) {
      const tokenHash = hashToken(token);
      const raw = await redis.get(refreshKey(prefix, tokenHash));
      if (!raw) {
        return false;
      }

      const record = JSON.parse(raw) as RefreshTokenRecord;
      await redis
        .multi()
        .del(refreshKey(prefix, tokenHash))
        .srem(userSessionsKey(prefix, record.userId), tokenHash)
        .exec();
      return true;
    },

    async blacklistJwt(jti: string, ttlSeconds: number) {
      if (ttlSeconds <= 0) {
        return;
      }
      await redis.set(jwtBlacklistKey(prefix, jti), "1", "EX", ttlSeconds);
    },

    async isJwtBlacklisted(jti: string) {
      const value = await redis.get(jwtBlacklistKey(prefix, jti));
      return value !== null;
    }
  };
}

export function getSessionStore(
  redis: RedisClient | null,
  options: SessionStoreOptions
): SessionStore | null {
  if (!redis) {
    return null;
  }
  return createSessionStore(redis, options);
}
