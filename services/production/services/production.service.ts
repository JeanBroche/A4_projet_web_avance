import type { ServiceSchema } from "moleculer";

const ProductionService: ServiceSchema = {
  name: "production",

  actions: {
    ping: {
      handler(ctx) {
        this.logger.info("Ping", { correlationId: ctx.meta.correlationId });
        return "pong";
      }
    }
  }
};

export default ProductionService;
