import type { ServiceSchema } from "moleculer";

const ReportingService: ServiceSchema = {
  name: "reporting",

  actions: {
    ping: {
      handler(ctx) {
        this.logger.info("Ping", { correlationId: ctx.meta.correlationId });
        return "pong";
      }
    }
  }
};

export default ReportingService;
