import type { Context, ServiceSchema } from "moleculer";
import ApiGateway from "moleculer-web";
import { authorizeRequest } from "../src/authorize.js";
import { applyHttpMeta } from "../src/http.js";
import { formatHttpError } from "../src/errors.js";
import { publicApiAliases, protectedApiAliases } from "../src/routes.js";
import { authFacadeActions } from "../src/facades/auth.facade.js";
import { checkGatewayHealth } from "../src/health.js";

const port = Number(process.env.GATEWAY_PORT || 4000);

function createRouteHooks(requireAuth: boolean) {
  return {
    authorization: requireAuth,
    authentication: requireAuth,
    mappingPolicy: "restrict" as const,
    bodyParsers: {
      json: { strict: false, limit: "1MB" },
      urlencoded: { extended: true, limit: "1MB" }
    },
    onBeforeCall(
      ctx: Context,
      _route: unknown,
      req: { headers?: Record<string, string | string[] | undefined> },
      _res: unknown
    ) {
      const meta = ctx.meta as Record<string, unknown>;
      meta.$req = req;
      applyHttpMeta(ctx, req);
    },
    async onAuthorize(
      this: { broker: { logger: { warn: (msg: string) => void } } },
      ctx: Context,
      _route: unknown,
      req: { headers?: Record<string, string | string[] | undefined> },
      _res: unknown
    ) {
      if (!requireAuth) return null;
      try {
        return await authorizeRequest(ctx, req);
      } catch (error) {
        this.broker.logger.warn(`Authorization failed: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
      }
    },
    onError(
      req: { headers?: Record<string, string | string[] | undefined> },
      res: { setHeader: (k: string, v: string) => void; writeHead: (code: number) => void; end: (body: string) => void },
      err: Error & { code?: string | number; data?: unknown }
    ) {
      const correlationId = req.headers?.["x-correlation-id"] as string | undefined;
      const { status, body } = formatHttpError(err, correlationId);
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.writeHead(status);
      res.end(JSON.stringify(body));
    }
  };
}

const ApiService: ServiceSchema = {
  name: "api",
  mixins: [ApiGateway],

  settings: {
    port,
    ip: "0.0.0.0",
    routes: [
      {
        path: "/health",
        aliases: {
          "GET /": "api.health"
        },
        mappingPolicy: "restrict",
        bodyParsers: { json: true }
      },
      {
        path: "/api",
        ...createRouteHooks(false),
        aliases: publicApiAliases
      },
      {
        path: "/api",
        ...createRouteHooks(true),
        aliases: protectedApiAliases
      }
    ]
  } as Record<string, unknown>,

  actions: {
    health: {
      async handler() {
        return checkGatewayHealth(this.broker);
      }
    },
    ...authFacadeActions
  }
};

export default ApiService;
