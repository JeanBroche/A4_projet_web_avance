import type { ActionSchema } from "moleculer";

export const pingAction: ActionSchema = {
  handler(ctx) {
    this.logger.info("Ping", { correlationId: ctx.meta.correlationId });
    return "pong";
  }
};
