import type { ServiceBroker } from "moleculer";

export const CRITICAL_SERVICES = [
  "auth",
  "stock",
  "order",
  "production",
  "shipment",
  "audit",
  "notification",
  "reporting"
] as const;

export type ServiceHealthStatus = "ok" | "error" | "timeout";

export type ServiceHealthEntry = {
  service: string;
  status: ServiceHealthStatus;
  latencyMs?: number;
  error?: string;
};

export type GatewayHealthResponse = {
  status: "ok" | "degraded";
  nodeID: string;
  ts: string;
  services: ServiceHealthEntry[];
};

const PING_TIMEOUT_MS = Number(process.env.GATEWAY_HEALTH_TIMEOUT_MS ?? 3_000);

async function pingService(
  broker: ServiceBroker,
  service: string
): Promise<ServiceHealthEntry> {
  const started = Date.now();
  try {
    const result = await broker.call<string, Record<string, never>>(
      `${service}.ping`,
      {},
      { timeout: PING_TIMEOUT_MS }
    );
    if (result !== "pong") {
      return {
        service,
        status: "error",
        latencyMs: Date.now() - started,
        error: `Unexpected ping response: ${String(result)}`
      };
    }
    return { service, status: "ok", latencyMs: Date.now() - started };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status: ServiceHealthStatus = message.includes("Timed out") ? "timeout" : "error";
    return {
      service,
      status,
      latencyMs: Date.now() - started,
      error: message
    };
  }
}

export async function checkGatewayHealth(broker: ServiceBroker): Promise<GatewayHealthResponse> {
  const services = await Promise.all(
    CRITICAL_SERVICES.map((service) => pingService(broker, service))
  );
  const allOk = services.every((entry) => entry.status === "ok");

  return {
    status: allOk ? "ok" : "degraded",
    nodeID: broker.nodeID ?? "unknown",
    ts: new Date().toISOString(),
    services
  };
}
