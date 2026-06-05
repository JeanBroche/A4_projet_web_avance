"use strict";

const { randomUUID } = require("crypto");

module.exports = {
  name: "CorrelationId",

  localAction(handler) {
    return async function correlationIdMiddleware(ctx) {
      const fromHeader =
        ctx.meta?.correlationId ||
        ctx.params?.req?.headers?.["x-correlation-id"] ||
        ctx.params?.req?.headers?.["x-request-id"];

      ctx.meta.correlationId = fromHeader || randomUUID();
      return handler(ctx);
    };
  }
};
