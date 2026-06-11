import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ServiceBroker } from "moleculer";
import { createConfig } from "../packages/moleculer-config/src/index.js";
import { getErrorCode } from "../packages/services-shared/src/errorUtils.js";
import { unwrapResponse } from "../packages/services-shared/src/responseUtils.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

const SERVICES = [
  "auth",
  "stock",
  "order",
  "production",
  "shipment",
  "audit",
  "notification",
  "reporting"
] as const;

const TIMEOUT_MS = 20_000;

async function callAction<T>(broker: ServiceBroker, action: string, params?: Record<string, unknown>) {
  return broker.call(action, params) as Promise<T>;
}

async function main() {
  const broker = new ServiceBroker({
    ...createConfig({ nodeID: "cross-service-smoke" }),
    logger: false
  });

  await broker.start();

  try {
    for (const name of SERVICES) {
      await broker.waitForServices(name, TIMEOUT_MS);
      const ping = await broker.call<string>(`${name}.ping`);
      if (ping !== "pong") {
        throw new Error(`${name}.ping expected pong, got ${String(ping)}`);
      }
    }

    const adminPassword = process.env.SEED_ADMIN_PASSWORD;
    if (!adminPassword) {
      throw new Error("SEED_ADMIN_PASSWORD is required for cross-service smoke");
    }

    const login = unwrapResponse(
      await callAction<{ accessToken: string; refreshToken: string }>(broker, "auth.login", {
        email: "admin@aeronexis.local",
        password: adminPassword
      })
    );

    const token = login.accessToken;

    const stockLevels = unwrapResponse(
      await callAction<unknown[]>(broker, "stock.level.list", {
        accessToken: token,
        siteCode: "SITE-LYO"
      })
    );

    const batches = unwrapResponse(
      await callAction<{ items: unknown[] }>(broker, "production.batch.list", {
        accessToken: token,
        siteCode: "SITE-LYO",
        limit: 5
      })
    );

    const orders = unwrapResponse(
      await callAction<{ items: unknown[] }>(broker, "order.order.history", {
        accessToken: token,
        siteCode: "SITE-LYO",
        limit: 5
      })
    );

    let lotTraceEvents = 0;
    try {
      const lotTrace = unwrapResponse(
        await callAction<{ timeline: unknown[] }>(broker, "audit.lot.trace", {
          accessToken: token,
          lotId: "BATCH-SEED-001"
        })
      );
      lotTraceEvents = lotTrace.timeline.length;
    } catch {
      lotTraceEvents = 0;
    }

    const inbox = unwrapResponse(
      await callAction<{ total: number }>(broker, "notification.inbox.list", {
        accessToken: token,
        siteCode: "SITE-LYO",
        limit: 10
      })
    );

    const rupture = unwrapResponse(
      await callAction<{ totalRuptureProducts: number }>(broker, "reporting.calcul.logistique.rupture", {
        accessToken: token,
        siteCode: "SITE-LYO"
      })
    );

    await broker.call("auth.logout", {
      refreshToken: login.refreshToken,
      accessToken: token
    });

    try {
      await broker.call("auth.me", { accessToken: token });
      throw new Error("Expected blacklisted access token to be rejected");
    } catch (error) {
      if (error instanceof Error && error.message.includes("Expected blacklisted")) {
        throw error;
      }
      if (getErrorCode(error) !== "TOKEN_INVALID") {
        throw error;
      }
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          services: SERVICES.length,
          stockMaterials: stockLevels.length,
          activeBatches: batches.items.length,
          orders: orders.items.length,
          lotTraceEvents,
          notifications: inbox.total,
          ruptureProducts: rupture.totalRuptureProducts
        },
        null,
        2
      )
    );
  } finally {
    await broker.stop();
  }
}

main().catch((error) => {
  console.error(
    JSON.stringify({
      ok: false,
      message: error instanceof Error ? error.message : String(error)
    })
  );
  process.exit(1);
});
