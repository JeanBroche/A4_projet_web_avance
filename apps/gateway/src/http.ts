import type { Context } from "moleculer";
import { getAccessTokenFromRequest } from "./cookies.js";

type IncomingRequest = {
  headers?: Record<string, string | string[] | undefined>;
};

function headerValue(
  headers: Record<string, string | string[] | undefined> | undefined,
  name: string
): string | undefined {
  const raw = headers?.[name] ?? headers?.[name.toLowerCase()];
  if (Array.isArray(raw)) return raw[0];
  return raw;
}

/** Map REST path param names to MS action param names (snake_case). */
export function normalizeMsParams(params: Record<string, unknown>) {
  const out = { ...params };
  if (out.batchCode != null && out.batch_code == null) out.batch_code = out.batchCode;
  if (out.batchId != null && out.batch_id == null) out.batch_id = out.batchId;
  if (out.productCode != null && out.product_code == null) out.product_code = out.productCode;
  if (out.bomCode != null && out.bom_code == null) out.bom_code = out.bomCode;
  if (out.anomalyCode != null && out.anomaly_code == null) out.anomaly_code = out.anomalyCode;
  if (out.stepCode != null && out.step_code == null) out.step_code = out.stepCode;
  if (out.lotNumber != null && out.lot_number == null) out.lot_number = out.lotNumber;
  return out;
}

export function applyHttpMeta(ctx: Context, req: IncomingRequest) {
  const meta = ctx.meta as Record<string, unknown>;
  const authorization = headerValue(req.headers, "authorization");
  if (authorization) {
    meta.authorization = authorization;
    if (authorization.startsWith("Bearer ")) {
      meta.accessToken = authorization.slice(7);
    }
  }

  const cookieAccessToken = getAccessTokenFromRequest(req);
  if (cookieAccessToken && !meta.accessToken) {
    meta.accessToken = cookieAccessToken;
    meta.authorization = `Bearer ${cookieAccessToken}`;
  }

  const correlationId =
    headerValue(req.headers, "x-correlation-id") ??
    headerValue(req.headers, "x-request-id");
  if (correlationId) {
    meta.correlationId = correlationId;
  }

  const params = normalizeMsParams(
    ctx.params && typeof ctx.params === "object" ? (ctx.params as Record<string, unknown>) : {}
  );
  if (meta.accessToken && !params.accessToken) {
    params.accessToken = meta.accessToken;
  }
  ctx.params = params;
}
