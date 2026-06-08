import { createHash, randomBytes } from "crypto";
import type { prisma as authPrisma } from "../db.js";

import { createError } from "@aeronexis/services-shared";
import { userInclude, type UserWithRoles } from "./user-mapper.js";

type AuthPrisma = typeof authPrisma;

const REFRESH_TTL_DAYS = parseRefreshTtlDays(process.env.JWT_REFRESH_TTL || "7d");

function parseRefreshTtlDays(value: string) {
  const match = /^(\d+)d$/i.exec(value.trim());
  if (!match) {
    return 7;
  }
  return Number(match[1]);
}

export function generateRefreshToken() {
  return randomBytes(32).toString("hex");
}

export function hashRefreshToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function getRefreshExpiresAt() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TTL_DAYS);
  return expiresAt;
}

export async function createRefreshTokenRecord(prisma: AuthPrisma, userId: string) {
  const refreshToken = generateRefreshToken();
  const tokenHash = hashRefreshToken(refreshToken);

  await prisma.refreshToken.create({
    data: {
      tokenHash,
      userId,
      expiresAt: getRefreshExpiresAt()
    }
  });

  return refreshToken;
}

export async function rotateRefreshToken(prisma: AuthPrisma, refreshToken: string) {
  const tokenHash = hashRefreshToken(refreshToken);
  const existing = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        include: userInclude
      }
    }
  });

  if (!existing || existing.revokedAt || existing.expiresAt <= new Date()) {
    throw createError("TOKEN_INVALID");
  }

  if (!existing.user.isActive) {
    throw createError("USER_INACTIVE");
  }

  const newRefreshToken = generateRefreshToken();
  const newTokenHash = hashRefreshToken(newRefreshToken);

  await prisma.$transaction([
    prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() }
    }),
    prisma.refreshToken.create({
      data: {
        tokenHash: newTokenHash,
        userId: existing.userId,
        expiresAt: getRefreshExpiresAt()
      }
    })
  ]);

  return {
    user: existing.user as UserWithRoles,
    refreshToken: newRefreshToken
  };
}

export async function revokeRefreshToken(prisma: AuthPrisma, refreshToken: string) {
  const tokenHash = hashRefreshToken(refreshToken);
  const existing = await prisma.refreshToken.findUnique({
    where: { tokenHash }
  });

  if (!existing || existing.revokedAt) {
    return false;
  }

  await prisma.refreshToken.update({
    where: { id: existing.id },
    data: { revokedAt: new Date() }
  });

  return true;
}
