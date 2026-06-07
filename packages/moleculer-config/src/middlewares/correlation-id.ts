import { randomUUID } from "node:crypto";
import type { Middleware } from "moleculer";

const correlationIdMiddleware: Middleware = {
  name: "CorrelationId",

  localAction(handler) {
    return async function correlationIdHandler(ctx) {
      const fromHeader =
        ctx.meta?.correlationId ||
        ctx.params?.req?.headers?.["x-correlation-id"] ||
        ctx.params?.req?.headers?.["x-request-id"];

      ctx.meta.correlationId = fromHeader || randomUUID();
      return handler.call(this, ctx);
    };
  }
};

export default correlationIdMiddleware;
