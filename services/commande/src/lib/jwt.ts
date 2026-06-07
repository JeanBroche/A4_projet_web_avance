import jwt from "jsonwebtoken";
import { createError } from "./errors.js";

export interface AccessTokenPayload {
  sub: string;
  email: string;
  siteId: string | null;
  roles: string[];
  iat: number;
  exp: number;
}

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is required.");
  }
  return secret;
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const payload = jwt.verify(token, getSecret());
    if (typeof payload === "string") {
      throw createError("TOKEN_INVALID");
    }
    return payload as AccessTokenPayload;
  } catch (error) {
    if (error && typeof error === "object" && "name" in error && error.name === "TokenExpiredError") {
      throw createError("TOKEN_EXPIRED");
    }
    throw createError("TOKEN_INVALID");
  }
}
