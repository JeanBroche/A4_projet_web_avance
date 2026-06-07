import type { ServiceSchema } from "moleculer";

const NotificationService: ServiceSchema = {
  name: "notification",

  actions: {
    ping: {
      handler(ctx) {
        this.logger.info("Ping", { correlationId: ctx.meta.correlationId });
        return "pong";
      }
    }
  }
};

export default NotificationService;
