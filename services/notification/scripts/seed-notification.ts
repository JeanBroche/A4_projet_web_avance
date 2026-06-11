import { config } from "dotenv";
import { resolve } from "node:path";
import {
  SEED_ANOMALY,
  SEED_BATCHES,
  SEED_MATERIALS,
  SEED_ORDERS,
  SEED_SHIPMENTS,
  SEED_SITES
} from "@aeronexis/shared";
import { getRedisClient, resetRedisClient } from "@aeronexis/redis-infra";
import { appendNotification } from "../src/lib/inbox.js";

config({ path: resolve(import.meta.dirname, "../../../.env") });

async function ensureRedisReady() {
  const client = getRedisClient();
  if (!client) {
    return;
  }
  if (client.status === "wait") {
    await client.connect();
  }
  await client.ping();
}

const NOTIFICATIONS = [
  {
    type: "stock.material.low",
    severity: "CRITICAL" as const,
    title: "Rupture ou seuil stock",
    message: `Stock ${SEED_MATERIALS.TITANE} sous le seuil minimum sur Lyon`,
    siteCode: SEED_SITES.LYO,
    payload: { materialCode: SEED_MATERIALS.TITANE },
    dedup: "seed:stock-low-lyo"
  },
  {
    type: "stock.supplier.delay",
    severity: "WARNING" as const,
    title: "Retard fournisseur",
    message: "Retard AeroMat FR sur livraison titane grade 5",
    siteCode: SEED_SITES.LYO,
    payload: { supplier: "AeroMat FR", materialCode: SEED_MATERIALS.TITANE },
    dedup: "seed:supplier-delay-lyo"
  },
  {
    type: "shipment.delivery.alert",
    severity: "WARNING" as const,
    title: "Retard livraison",
    message: `Expedition ${SEED_SHIPMENTS.IN_TRANSIT} en transit avec risque de retard`,
    siteCode: SEED_SITES.LYO,
    payload: { shipmentCode: SEED_SHIPMENTS.IN_TRANSIT, orderNumber: SEED_ORDERS.CMD04 },
    dedup: "seed:shipment-delay-lyo"
  },
  {
    type: "production.batch.anomaly",
    severity: "WARNING" as const,
    title: "Anomalie lot production",
    message: `Anomalie ouverte sur lot ${SEED_BATCHES.LYO_IN_PROGRESS} (${SEED_ANOMALY.CODE})`,
    siteCode: SEED_SITES.LYO,
    payload: { lotId: SEED_BATCHES.LYO_IN_PROGRESS, anomalyCode: SEED_ANOMALY.CODE },
    dedup: "seed:batch-anomaly-lyo"
  },
  {
    type: "order.draft",
    severity: "INFO" as const,
    title: "Nouvelle commande Paris",
    message: `Commande brouillon ${SEED_ORDERS.CMD_PAR} en attente sur le site Paris`,
    siteCode: SEED_SITES.PAR,
    payload: { orderNumber: SEED_ORDERS.CMD_PAR },
    dedup: "seed:order-par"
  }
];

async function main() {
  try {
    await ensureRedisReady();
  } catch (error) {
    console.warn(
      "Redis unavailable for notification seed, using in-memory inbox:",
      error instanceof Error ? error.message : error
    );
  }

  let created = 0;
  for (const entry of NOTIFICATIONS) {
    const { dedup, ...input } = entry;
    const record = await appendNotification(input, dedup);
    if (record) {
      created += 1;
    }
  }
  console.log("Notification seed completed:", { created, total: NOTIFICATIONS.length });
  resetRedisClient();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
