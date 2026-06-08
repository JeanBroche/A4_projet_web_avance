import jwt, { type SignOptions } from "jsonwebtoken";
import { createError } from "./errorUtils.js";

const ACCESS_TTL = process.env.JWT_ACCESS_TTL || "15m";

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

export function signAccessToken(payload: Omit<AccessTokenPayload, "iat" | "exp">) {
  const options: SignOptions = { expiresIn: ACCESS_TTL as SignOptions["expiresIn"] };
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
