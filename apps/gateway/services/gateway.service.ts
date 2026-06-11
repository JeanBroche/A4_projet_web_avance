import type { ServiceSchema, Context } from "moleculer";
import ApiGateway, { type ApiSettingsSchema } from "moleculer-web";

const version = process.env.GATEWAY_VERSION ?? '1.0.0';

type ApiServiceSchema = ServiceSchema & {
  settings: ApiSettingsSchema;
};

export interface ApiMeta {
  user?: { id: string; role: string };
  requestId?: string;
}

const GatewayService: ApiServiceSchema = {
  name: "api",
  mixins: [ApiGateway],

  settings: {
    port: Number(process.env.GATEWAY_PORT) || 4000,
    ip: "0.0.0.0",

    path: "/api",

    routes: [
      {
        path: "/v1",

        authorization: true,

        // cors: {
        //   origin: "*",
        //   methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        // },

        aliases: {
          "GET /orders": "orders.list",
          "GET /orders/:id": "orders.get",
          "POST /orders": "orders.create",
          "PUT /orders/:id": "orders.update",
          "DELETE /orders/:id": "orders.remove",

          "GET /stocks": "stocks.list",
          "GET /stocks/:id": "stocks.get",
          "POST /stocks": "stocks.create",
          "PUT /stocks/:id": "stocks.update",
        },

        // all = all actions exposed, restrict = only those in aliases
        mappingPolicy: "restrict",

        bodyParsers: {
          json: { strict: false, limit: "1MB" },
          urlencoded: { extended: true, limit: "1MB" },
        },

        onBeforeCall(
          ctx: Context<unknown, ApiMeta>,
          _route: object,
          req: any,
          _res: any
        ): void {
          ctx.meta.requestId = req.headers["x-request-id"];
        },

        onAfterCall(
          ctx: Context<unknown, ApiMeta>,
          _route: object,
          _req: any,
          _res: any,
          data: any
        ): any {
          return {
            success: true,
            data,
            meta: {
              requestId: ctx.meta.requestId,
              timestamp: new Date().toISOString(),
            },
          };
        },
      },

      {
        path: "/v1/public",
        authorization: false,
        aliases: {
          "GET /health": "health.check",
        },
        onAfterCall(
          _ctx: Context,
          _route: object,
          _req: any,
          _res: any,
          data: any
        ): any {
          return {
            success: true,
            data,
            meta: {
              timestamp: new Date().toISOString(),
            },
            version
          }
        }
      },
    ],

    onError(_req: any, res: any, err: any): void {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.writeHead(err.code || 500);
      res.end(
        JSON.stringify({
          success: false,
          error: {
            message: err.message,
            code: err.code || 500,
            type: err.type || "INTERNAL_ERROR",
          },
        })
      );
    },
  },
};

export default GatewayService;