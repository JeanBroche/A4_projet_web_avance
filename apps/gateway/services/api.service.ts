import type { Context, ServiceSchema } from "moleculer";

type ApiMeta = { correlationId?: string };

const ApiService: ServiceSchema = {
  name: "health",
  actions: {
    check: {
      async handler(ctx: Context<unknown, ApiMeta>) {
        this.logger.info("Health check", {
          correlationId: ctx.meta.correlationId
        });

        return {
          status: "ok"
        };
      }
    }
  }
};

export default ApiService;
