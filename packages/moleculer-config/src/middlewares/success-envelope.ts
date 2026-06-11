import type { Middleware } from "moleculer";
import { isApiEnvelopeEnabled, isSuccessEnvelope, successResponse } from "@aeronexis/services-shared";

function shouldSkipEnvelope(actionName: string, result: unknown) {
  if (actionName.endsWith(".ping")) {
    return true;
  }
  if (result === null || result === undefined) {
    return false;
  }
  if (typeof result !== "object") {
    return true;
  }
  if (isSuccessEnvelope(result)) {
    return true;
  }
  if ("error" in (result as Record<string, unknown>)) {
    return true;
  }
  return false;
}

const successEnvelopeMiddleware: Middleware = {
  name: "SuccessEnvelope",

  localAction(handler, action) {
    return async function successEnvelopeHandler(ctx) {
      const result = await handler.call(this, ctx);
      if (!isApiEnvelopeEnabled() || shouldSkipEnvelope(action.name ?? "", result)) {
        return result;
      }
      return successResponse(result, {
        correlationId: (ctx.meta as { correlationId?: string }).correlationId
      });
    };
  }
};

export default successEnvelopeMiddleware;
