import type { Context } from "moleculer";
import { Errors } from "moleculer";
import { verifyAccessTokenWithBlacklist } from "@aeronexis/services-shared";
import { getAccessTokenFromRequest } from "./cookies.js";

const { MoleculerClientError } = Errors;

type IncomingRequest = {
  headers?: Record<string, string | string[] | undefined>;
};

function readBearerToken(req: IncomingRequest): string | undefined {
  const raw = req.headers?.authorization ?? req.headers?.Authorization;
  const header = Array.isArray(raw) ? raw[0] : raw;
  if (!header || !header.startsWith("Bearer ")) return undefined;
  return header.slice(7);
}

export function resolveRequestAccessToken(req: IncomingRequest): string | undefined {
  return getAccessTokenFromRequest(req) ?? readBearerToken(req);
}

export async function authorizeRequest(
  ctx: Context,
  req: IncomingRequest
) {
  const token = resolveRequestAccessToken(req);

  if (!token) {
    throw new MoleculerClientError("Missing or invalid access token", 401, "TOKEN_INVALID");
  }

  const payload = await verifyAccessTokenWithBlacklist(token);

  const meta = ctx.meta as Record<string, unknown>;
  meta.user = payload;
  meta.authorization = `Bearer ${token}`;
  meta.accessToken = token;

  return payload;
}
