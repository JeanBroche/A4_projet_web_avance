import type { ServiceSchema } from "moleculer";

const AuditService: ServiceSchema = {
  name: "audit",

  actions: {
    ping: {
      handler(ctx) {
        this.logger.info("Ping", { correlationId: ctx.meta.correlationId });
        return "pong";
      }
    }
  }
};

export default AuditService;
