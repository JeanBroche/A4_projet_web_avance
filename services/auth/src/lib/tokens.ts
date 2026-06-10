import { createHash, randomBytes } from "crypto";

import { createError } from "@aeronexis/services-shared";
import {
  getRedisClient,
  getSessionStore,
  type SessionStore
} from "@aeronexis/redis-infra";

import { Errors } from "moleculer";

import { prisma } from "../db.js";
import { userInclude, type UserWithRoles } from "./user-mapper.js";

type AuthPrisma = typeof prisma;

const REFRESH_TTL_SECONDS = parseRefreshTtlSeconds(process.env.JWT_REFRESH_TTL || "7d");

function parseRefreshTtlSeconds(value: string) {
  const match = /^(\d+)d$/i.exec(value.trim());
  if (!match) {
    return 7 * 24 * 60 * 60;
  }
  return Number(match[1]) * 24 * 60 * 60;
}

let sessionStore: SessionStore | null = null;

function getStore(): SessionStore {
  if (!sessionStore) {
    const redis = getRedisClient();
    const store = getSessionStore(redis, { refreshTtlSeconds: REFRESH_TTL_SECONDS });
    if (!store) {
      throw new Errors.MoleculerServerError(
        "Redis is required for refresh tokens",
        503,
        "SERVICE_UNAVAILABLE"
      );
    }
    sessionStore = store;
  }
  return sessionStore;
}

export function generateRefreshToken() {
  return randomBytes(32).toString("hex");
}

export function hashRefreshToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createRefreshTokenRecord(_prisma: AuthPrisma, userId: string) {
  const { token } = await getStore().createRefreshToken(userId);
  return token;
}

export async function rotateRefreshToken(_prisma: AuthPrisma, refreshToken: string) {
  const rotated = await getStore().rotateRefreshToken(refreshToken);
  if (!rotated) {
    throw createError("TOKEN_INVALID");
  }

  const user = await prisma.user.findFirst({
    where: { id: rotated.record.userId },
    include: userInclude
  });

  if (!user) {
    throw createError("TOKEN_INVALID");
  }

  if (!user.isActive) {
    throw createError("USER_INACTIVE");
  }

  return {
    user: user as UserWithRoles,
    refreshToken: rotated.token
  };
}

export async function revokeRefreshToken(_prisma: AuthPrisma, refreshToken: string) {
  return getStore().revokeRefreshToken(refreshToken);
}

export async function blacklistAccessToken(jti: string, ttlSeconds: number) {
  await getStore().blacklistJwt(jti, ttlSeconds);
}

export async function isAccessTokenBlacklisted(jti: string) {
  return getStore().isJwtBlacklisted(jti);
}
