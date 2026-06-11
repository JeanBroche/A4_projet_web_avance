import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { BrokerOptions } from "moleculer";
import { registerJwtBlacklistChecker } from "@aeronexis/services-shared";
import { getRedisClient } from "@aeronexis/redis-infra";
import correlationIdMiddleware from "./middlewares/correlation-id.js";
import successEnvelopeMiddleware from "./middlewares/success-envelope.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  config({ path: resolve(__dirname, "../../../.env") });
}

function registerJwtRevocationChecker() {
  const redis = getRedisClient();
  if (!redis) {
    return;
  }

  registerJwtBlacklistChecker(async (jti) => {
    const value = await redis.get(`auth:jwt:blacklist:${jti}`);
    return value !== null;
  });
}

export function createConfig(overrides: BrokerOptions = {}): BrokerOptions {
  loadEnv();
  registerJwtRevocationChecker();

  const middlewares = [correlationIdMiddleware];
  if (process.env.API_SUCCESS_ENVELOPE === "true") {
    middlewares.push(successEnvelopeMiddleware);
  }

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
    middlewares,
    ...overrides
  };
}
