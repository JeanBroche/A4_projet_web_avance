import { Errors } from "moleculer";
import type { Middleware } from "moleculer";
import {
  failureResponse,
  isApiEnvelopeEnabled,
  type ApiErrorPayload
} from "@aeronexis/services-shared";

const { MoleculerClientError } = Errors;

function shouldSkipEnvelope(actionName: string) {
  return actionName.endsWith(".ping");
}

const errorEnvelopeMiddleware: Middleware = {
  name: "ErrorEnvelope",

  localAction(handler, action) {
    return async function errorEnvelopeHandler(ctx) {
      if (!isApiEnvelopeEnabled() || shouldSkipEnvelope(action.name ?? "")) {
        return handler.call(this, ctx);
      }

      try {
        return await handler.call(this, ctx);
      } catch (error) {
        const correlationId = (ctx.meta as { correlationId?: string }).correlationId;
        const meta = correlationId ? { correlationId } : undefined;

        if (error instanceof MoleculerClientError) {
          const data = error.data as ApiErrorPayload | undefined;
          if (data?.error) {
            error.data = failureResponse(data.error, meta);
          } else {
            error.data = failureResponse(
              {
                code: String(error.code ?? "UNKNOWN_ERROR"),
                message: error.message
              },
              meta
            );
          }
          throw error;
        }

        throw new MoleculerClientError(
          error instanceof Error ? error.message : "Unexpected error",
          500,
          "INTERNAL_ERROR",
          failureResponse(
            {
              code: "INTERNAL_ERROR",
              message: error instanceof Error ? error.message : "Unexpected error"
            },
            meta
          )
        );
      }
    };
  }
};

export default errorEnvelopeMiddleware;
