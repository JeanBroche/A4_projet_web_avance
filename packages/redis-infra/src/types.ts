import type { Redis } from "ioredis";

export type RedisClient = Redis;

export interface RedisLogger {
  warn(message: string, meta?: Record<string, unknown>): void;
}

export interface CacheOptions {
  namespace: string;
  keyParts: Record<string, unknown>;
  ttlSeconds?: number;
  logger?: RedisLogger;
}

export interface LockOptions {
  key: string;
  ttlMs?: number;
  retries?: number;
  retryDelayMs?: number;
  logger?: RedisLogger;
}

export interface RefreshTokenRecord {
  userId: string;
  familyId: string;
  expiresAt: string;
}

export interface SessionStoreOptions {
  refreshTtlSeconds: number;
  keyPrefix?: string;
}

export interface SessionStore {
  createRefreshToken(userId: string): Promise<{ token: string; tokenHash: string }>;
  rotateRefreshToken(
    token: string
  ): Promise<{ token: string; tokenHash: string; record: RefreshTokenRecord } | null>;
  revokeRefreshToken(token: string): Promise<boolean>;
  blacklistJwt(jti: string, ttlSeconds: number): Promise<void>;
  isJwtBlacklisted(jti: string): Promise<boolean>;
}
