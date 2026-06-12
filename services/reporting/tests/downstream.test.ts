import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { ServiceBroker } from "moleculer";
import { successResponse } from "@aeronexis/services-shared";
import { callDownstream } from "../src/lib/downstream.js";

const broker = new ServiceBroker({
  nodeID: "reporting-downstream-test",
  logger: false,
  transporter: null
});

before(async () => {
  broker.createService({
    name: "fixture",
    actions: {
      wrapped: {
        handler() {
          return successResponse({ items: ["a", "b"] });
        }
      },
      plain: {
        handler() {
          return { items: ["x", "y"] };
        }
      }
    }
  });

  broker.createService({
    name: "reporting-test",
    actions: {
      probeWrapped: {
        async handler(ctx) {
          return callDownstream<{ items: string[] }>(ctx, "fixture.wrapped", {});
        }
      },
      probePlain: {
        async handler(ctx) {
          return callDownstream<{ items: string[] }>(ctx, "fixture.plain", {});
        }
      }
    }
  });

  await broker.start();
});

after(async () => {
  await broker.stop();
});

describe("callDownstream", () => {
  it("unwraps success envelopes from downstream actions", async () => {
    const result = await broker.call<{ items: string[] }>("reporting-test.probeWrapped");
    assert.deepEqual(result, { items: ["a", "b"] });
  });

  it("returns plain payloads unchanged", async () => {
    const result = await broker.call<{ items: string[] }>("reporting-test.probePlain");
    assert.deepEqual(result, { items: ["x", "y"] });
  });
});
