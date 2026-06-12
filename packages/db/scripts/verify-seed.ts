import { config } from "dotenv";
import { resolve } from "node:path";
import { Redis } from "ioredis";
import pg from "pg";

config({ path: resolve(import.meta.dirname, "../../../.env") });

const { Pool } = pg;

type Check = { name: string; query: string; url: string | undefined; min: number };

const checks: Check[] = [
  {
    name: "auth users",
    url: process.env.AUTH_DATABASE_URL,
    query: `SELECT COUNT(*)::int AS c FROM auth.users WHERE "deletedAt" IS NULL`,
    min: 5
  },
  {
    name: "stock reservations ACTIVE",
    url: process.env.STOCK_DATABASE_URL,
    query: `SELECT COUNT(*)::int AS c FROM stock.stock_reservations WHERE status = 'ACTIVE'`,
    min: 3
  },
  {
    name: "order statuses",
    url: process.env.ORDER_DATABASE_URL,
    query: `SELECT COUNT(DISTINCT status)::int AS c FROM "order".customer_orders WHERE "deletedAt" IS NULL`,
    min: 4
  },
  {
    name: "production batches",
    url: process.env.PRODUCTION_DATABASE_URL,
    query: `SELECT COUNT(*)::int AS c FROM production."BatchProduct" WHERE "deletedAt" IS NULL`,
    min: 6
  },
  {
    name: "shipments",
    url: process.env.SHIPMENT_DATABASE_URL,
    query: `SELECT COUNT(*)::int AS c FROM shipment.shipments WHERE "deletedAt" IS NULL`,
    min: 4
  },
  {
    name: "material_lots",
    url: process.env.STOCK_DATABASE_URL,
    query: `SELECT COUNT(*)::int AS c FROM stock.material_lots`,
    min: 4
  },
  {
    name: "purchase_orders",
    url: process.env.STOCK_DATABASE_URL,
    query: `SELECT COUNT(*)::int AS c FROM stock.purchase_orders`,
    min: 2
  },
  {
    name: "orders with carrier",
    url: process.env.ORDER_DATABASE_URL,
    query: `SELECT COUNT(*)::int AS c FROM "order".customer_orders WHERE carrier IS NOT NULL AND "deletedAt" IS NULL`,
    min: 3
  },
  {
    name: "paris batches",
    url: process.env.PRODUCTION_DATABASE_URL,
    query: `SELECT COUNT(*)::int AS c FROM production."BatchProduct" WHERE "siteCode" = 'SITE-PAR' AND "deletedAt" IS NULL`,
    min: 1
  },
  {
    name: "paris shipments",
    url: process.env.SHIPMENT_DATABASE_URL,
    query: `SELECT COUNT(*)::int AS c FROM shipment.shipments WHERE "siteCode" = 'SITE-PAR' AND "deletedAt" IS NULL`,
    min: 1
  },
  {
    name: "pick lists PENDING",
    url: process.env.SHIPMENT_DATABASE_URL,
    query: `SELECT COUNT(*)::int AS c FROM shipment.pick_lists WHERE status = 'PENDING'`,
    min: 1
  }
];

async function countCheck(check: Check): Promise<number> {
  if (!check.url) {
    throw new Error(`${check.name}: missing database URL`);
  }
  const pool = new Pool({ connectionString: check.url });
  try {
    const result = await pool.query<{ c: number }>(check.query);
    return result.rows[0]?.c ?? 0;
  } finally {
    await pool.end();
  }
}

async function verifyMongo(): Promise<void> {
  const uri = process.env.MONGO_URL;
  if (!uri) {
    console.warn("⚠ MONGO_URL not set — skipping Mongo checks");
    return;
  }
  const { MongoClient } = await import("mongodb");
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(process.env.MONGO_DB ?? "aeronexis_audit");
    const auditLogs = await db.collection("audit_logs").countDocuments();
    const critical = await db.collection("critical_events").countDocuments();
    const documents = await db.collection("document_attachments").countDocuments();
    if (auditLogs < 12) {
      throw new Error(`audit_logs: expected >= 12, got ${auditLogs}`);
    }
    if (critical < 3) {
      throw new Error(`critical_events: expected >= 3, got ${critical}`);
    }
    if (documents < 1) {
      throw new Error(`document_attachments: expected >= 1, got ${documents}`);
    }
    console.log(
      `✓ mongo audit_logs (${auditLogs}), critical_events (${critical}), document_attachments (${documents})`
    );
  } finally {
    await client.close();
  }
}

async function verifyRedis(): Promise<void> {
  const url = process.env.REDIS_URL;
  if (!url) {
    console.warn("⚠ REDIS_URL not set — skipping notification inbox check");
    return;
  }
  const client = new Redis(url);
  try {
    const lyoLen = await client.llen("notification:inbox:SITE-LYO");
    const parLen = await client.llen("notification:inbox:SITE-PAR");
    const total = lyoLen + parLen;
    if (total < 8) {
      throw new Error(`notification inboxes total: expected >= 8, got ${total}`);
    }
    console.log(`✓ redis notifications SITE-LYO (${lyoLen}), SITE-PAR (${parLen})`);
  } finally {
    await client.quit();
  }
}

async function main() {
  console.log("Verifying seed data...\n");

  for (const check of checks) {
    const count = await countCheck(check);
    if (count < check.min) {
      throw new Error(`${check.name}: expected >= ${check.min}, got ${count}`);
    }
    console.log(`✓ ${check.name} (${count})`);
  }

  await verifyMongo();
  await verifyRedis();

  console.log("\nSeed verification passed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
