import { randomUUID } from "node:crypto";
import jwt, { type SignOptions } from "jsonwebtoken";
import { createError } from "./errorUtils.js";

const ACCESS_TTL = process.env.JWT_ACCESS_TTL || "15m";

export interface AccessTokenPayload {
  sub: string;
  email: string;
  siteId: string | null;
  roles: string[];
  jti?: string;
  iat: number;
  exp: number;
}

export type JwtBlacklistChecker = (jti: string) => Promise<boolean>;

let jwtBlacklistChecker: JwtBlacklistChecker | null = null;

export function registerJwtBlacklistChecker(checker: JwtBlacklistChecker | null) {
  jwtBlacklistChecker = checker;
}

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is required.");
  }
  return secret;
}

export function signAccessToken(payload: Omit<AccessTokenPayload, "iat" | "exp" | "jti">) {
  const options: SignOptions = {
    expiresIn: ACCESS_TTL as SignOptions["expiresIn"],
    jwtid: randomUUID()
  };
  return jwt.sign(payload, getSecret(), options);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, getSecret());
    if (typeof decoded === "string") {
      throw createError("TOKEN_INVALID");
    }
    return decoded as AccessTokenPayload;
  } catch (error) {
    if (error instanceof Error && error.name === "TokenExpiredError") {
      throw createError("TOKEN_EXPIRED");
    }
    throw createError("TOKEN_INVALID");
  }
}

export async function verifyAccessTokenWithBlacklist(token: string): Promise<AccessTokenPayload> {
  const payload = verifyAccessToken(token);
  if (payload.jti && jwtBlacklistChecker) {
    const blacklisted = await jwtBlacklistChecker(payload.jti);
    if (blacklisted) {
      throw createError("TOKEN_INVALID", "Token has been revoked");
    }
  }
  return payload;
}

export function decodeAccessToken(token: string): AccessTokenPayload | null {
  const decoded = jwt.decode(token);
  if (!decoded || typeof decoded === "string") {
    return null;
  }
  return decoded as AccessTokenPayload;
}

export function accessTokenRemainingTtlSeconds(token: string): number {
  const decoded = decodeAccessToken(token);
  if (!decoded?.exp) {
    return 0;
  }
  return Math.max(0, decoded.exp - Math.floor(Date.now() / 1000));
}
