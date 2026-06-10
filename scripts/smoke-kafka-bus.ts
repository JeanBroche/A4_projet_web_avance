import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { ServiceBroker, type Context, type ServiceSchema } from "moleculer";

import { createConfig } from "../packages/moleculer-config/src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

config({ path: resolve(__dirname, "../.env") });

const kafkaBrokers = process.env.KAFKA_BROKERS ?? "localhost:9092";

const EchoService: ServiceSchema = {
  name: "kafka-smoke",
  actions: {
    ping() {
      return "pong";
    }
  },
  events: {
    "kafka-smoke.pinged"(ctx: Context<{ ok: boolean }>) {
      this.logger.info("kafka-smoke event received", ctx.params);
    }
  }
};

async function main() {
  const brokerA = new ServiceBroker({
    ...createConfig({ nodeID: "kafka-smoke-a" }),
    logger: false
  });
  const brokerB = new ServiceBroker({
    ...createConfig({ nodeID: "kafka-smoke-b" }),
    logger: false
  });

  brokerA.createService(EchoService);

  try {
    await brokerA.start();
    await brokerB.start();
    await brokerB.waitForServices("kafka-smoke", 15_000);

    const ping = await brokerB.call<string>("kafka-smoke.ping");
    if (ping !== "pong") {
      throw new Error(`Unexpected ping response: ${String(ping)}`);
    }

    await brokerB.broadcast("kafka-smoke.pinged", { ok: true });
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 1_000));

    console.log(
      JSON.stringify({
        ok: true,
        kafkaBrokers,
        ping
      })
    );
  } finally {
    await brokerB.stop().catch(() => {});
    await brokerA.stop().catch(() => {});
  }
}

main().catch((error) => {
  console.error(
    JSON.stringify({
      ok: false,
      kafkaBrokers,
      message: error instanceof Error ? error.message : String(error)
    })
  );
  process.exit(1);
});
