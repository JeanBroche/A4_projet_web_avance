import type { ServiceSchema } from "moleculer";

const ExpeditionService: ServiceSchema = {
  name: "expedition",

  actions: {
    ping: {
      handler(ctx) {
        this.logger.info("Ping", { correlationId: ctx.meta.correlationId });
        return "pong";
      }
    }
  }
};

export default ExpeditionService;
