import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { BrokerOptions } from "moleculer";
import { registerJwtBlacklistChecker } from "@aeronexis/services-shared";
import { ensureRedisConnected, getRedisClient } from "@aeronexis/redis-infra";
import correlationIdMiddleware from "./middlewares/correlation-id.js";
import successEnvelopeMiddleware from "./middlewares/success-envelope.js";
import errorEnvelopeMiddleware from "./middlewares/error-envelope.js";
import { isApiEnvelopeEnabled } from "@aeronexis/services-shared";

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
    await ensureRedisConnected(redis);
    const value = await redis.get(`auth:jwt:blacklist:${jti}`);
    return value !== null;
  });
}

function parseBrokerList(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/**
 * Moleculer RPC bus via Kafka (@platformatic/kafka).
 * Use lowercase kafka:// in MOLECULER_TRANSPORTER — Kafka:// is rejected by Moleculer.
 */
function resolveTransporter(): BrokerOptions["transporter"] {
  const explicit = process.env.MOLECULER_TRANSPORTER?.trim();
  if (explicit && !explicit.toLowerCase().startsWith("kafka://")) {
    return explicit as BrokerOptions["transporter"];
  }

  const brokers = explicit
    ? parseBrokerList(explicit.replace(/^kafka:\/\//i, ""))
    : parseBrokerList(process.env.KAFKA_BROKERS ?? "localhost:9092");

  return {
    type: "Kafka",
    options: {
      clientId: process.env.KAFKA_CLIENT_ID ?? "moleculer-aeronexis",
      bootstrapBrokers: brokers
    }
  };
}

export function createConfig(overrides: BrokerOptions = {}): BrokerOptions {
  loadEnv();
  registerJwtRevocationChecker();

  const middlewares = [correlationIdMiddleware];
  if (isApiEnvelopeEnabled()) {
    middlewares.push(errorEnvelopeMiddleware, successEnvelopeMiddleware);
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
    transporter: resolveTransporter(),
    serializer: "JSON",
    middlewares,
    ...overrides
  };
}
