import jwt from "jsonwebtoken";
import { createError } from "./errors.mjs";

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is required.");
  }
  return secret;
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