import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ServiceBroker } from "moleculer";
import { checkGatewayHealth, CRITICAL_SERVICES } from "../src/health.js";

describe("checkGatewayHealth", () => {
  it("reports ok when all critical services respond pong", async () => {
    const broker = new ServiceBroker({ logger: false, transporter: null });
    for (const service of CRITICAL_SERVICES) {
      broker.createService({
        name: service,
        actions: {
          ping: () => "pong"
        }
      });
    }
    await broker.start();

    try {
      const health = await checkGatewayHealth(broker);
      assert.equal(health.status, "ok");
      assert.equal(health.services.length, CRITICAL_SERVICES.length);
      assert.ok(health.services.every((entry) => entry.status === "ok"));
    } finally {
      await broker.stop();
    }
  });

  it("reports degraded when a service is unavailable", async () => {
    const broker = new ServiceBroker({ logger: false, transporter: null });
    broker.createService({
      name: "auth",
      actions: {
        ping: () => "pong"
      }
    });
    await broker.start();

    try {
      const health = await checkGatewayHealth(broker);
      assert.equal(health.status, "degraded");
      const auth = health.services.find((entry) => entry.service === "auth");
      const stock = health.services.find((entry) => entry.service === "stock");
      assert.equal(auth?.status, "ok");
      assert.equal(stock?.status, "error");
    } finally {
      await broker.stop();
    }
  });
});
