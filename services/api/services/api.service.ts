import ApiGateway from "moleculer-web";
import type { Context, ServiceSchema } from "moleculer";
import type { IncomingMessage } from "node:http";
import packageJson from "../package.json" with { type: "json" };

const { version } = packageJson;

type GatewayRequest = IncomingMessage & {
  headers: Record<string, string | string[] | undefined>;
};

type ApiMeta = { correlationId?: string };

const ApiService = {
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
        onBeforeCall(ctx: Context<unknown, ApiMeta>, _route: unknown, req: GatewayRequest) {
          const raw =
            req.headers["x-correlation-id"] ||
            req.headers["x-request-id"];
          const correlationId = Array.isArray(raw) ? raw[0] : raw;

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
        onBeforeCall(ctx: Context<unknown, ApiMeta>, _route: unknown, req: GatewayRequest) {
          const raw =
            req.headers["x-correlation-id"] ||
            req.headers["x-request-id"];
          const correlationId = Array.isArray(raw) ? raw[0] : raw;

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
      handler(ctx: Context<unknown, ApiMeta>) {
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
} as ServiceSchema;

export default ApiService;
