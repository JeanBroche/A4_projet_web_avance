import jwt from "jsonwebtoken";
import { createError } from "./errors.mjs";

const ACCESS_TTL = process.env.JWT_ACCESS_TTL || "15m";

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is required.");
  }
  return secret;
}

/**
 * @param {{ sub: string, email: string, siteId: string | null, roles: string[] }} payload
 */
export function signAccessToken(payload) {
  return jwt.sign(payload, getSecret(), { expiresIn: ACCESS_TTL });
}

/**
 * @param {string} token
 * @returns {{ sub: string, email: string, siteId: string | null, roles: string[], iat: number, exp: number }}
 */
export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, getSecret());
  } catch (error) {
    if (error?.name === "TokenExpiredError") {
      throw createError("TOKEN_EXPIRED");
    }
    throw createError("TOKEN_INVALID");
  }
}
