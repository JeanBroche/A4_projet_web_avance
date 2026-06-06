"use strict";

const ApiGateway = require("moleculer-web");

const { version } = require("../package.json");

module.exports = {
  name: "api",
  mixins: [ApiGateway],

  settings: {
    port: Number(process.env.GATEWAY_PORT) || 4000,
    routes: [
      {
        path: "/api",
        aliases: {
          "GET health": "api.health"
        },
        mappingPolicy: "restrict",
        onBeforeCall(ctx, _route, req) {
          const correlationId =
            req.headers["x-correlation-id"] ||
            req.headers["x-request-id"];

          if (correlationId) {
            ctx.meta.correlationId = correlationId;
          }
        }
      },
      {
        path: "/",
        aliases: {
          "GET health": "api.health"
        },
        mappingPolicy: "restrict",
        onBeforeCall(ctx, _route, req) {
          const correlationId =
            req.headers["x-correlation-id"] ||
            req.headers["x-request-id"];

          if (correlationId) {
            ctx.meta.correlationId = correlationId;
          }
        }
      }
    ]
  },

  actions: {
    health: {
      rest: "GET /health",
      handler(ctx) {
        this.logger.info("Health check", {
          correlationId: ctx.meta.correlationId
        });

        return {
          status: "ok",
          version
        };
      }
    }
  }
};
