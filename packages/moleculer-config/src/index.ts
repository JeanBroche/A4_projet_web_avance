import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { BrokerOptions } from "moleculer";
import correlationIdMiddleware from "./middlewares/correlation-id.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  config({ path: resolve(__dirname, "../../../.env") });
}

export function createConfig(overrides: BrokerOptions = {}): BrokerOptions {
  loadEnv();

  return {
    namespace: "aeronexis",
    nodeID: overrides.nodeID ?? null,
    logger: {
      type: "Console",
      options: {
        level: process.env.LOG_LEVEL || "info",
        formatter: "json",
        colors: false
      }
    },
    transporter: `Kafka://${process.env.KAFKA_BROKERS || "localhost:9092"}` as BrokerOptions["transporter"],
    serializer: "JSON",
    middlewares: [correlationIdMiddleware],
    ...overrides
  };
}
