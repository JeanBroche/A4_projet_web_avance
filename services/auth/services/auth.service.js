"use strict";

module.exports = {
  name: "auth",

  actions: {
    ping: {
      handler(ctx) {
        this.logger.info("Ping", {
          correlationId: ctx.meta.correlationId
        });

        return "pong";
      }
    }
  }
};
