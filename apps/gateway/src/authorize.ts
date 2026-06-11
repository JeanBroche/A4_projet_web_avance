import type { Context } from "moleculer";
import { Errors } from "moleculer";
import { verifyAccessTokenWithBlacklist } from "@aeronexis/services-shared";

const { MoleculerClientError } = Errors;

export async function authorizeRequest(
  ctx: Context,
  req: { headers?: Record<string, string | string[] | undefined> }
) {
  const raw = req.headers?.authorization;
  const header = Array.isArray(raw) ? raw[0] : raw;

  if (!header || !header.startsWith("Bearer ")) {
    throw new MoleculerClientError("Missing or invalid Authorization header", 401, "TOKEN_INVALID");
  }

  const token = header.slice(7);
  const payload = await verifyAccessTokenWithBlacklist(token);

  const meta = ctx.meta as Record<string, unknown>;
  meta.user = payload;
  meta.authorization = header;
  meta.accessToken = token;

  return payload;
}
