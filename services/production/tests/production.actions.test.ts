import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { ServiceBroker } from "moleculer";
import jwt, { type SignOptions } from "jsonwebtoken";
import moleculerConfig from "../moleculer.config.js";
import ProductionService from "../services/production.service.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

config({ path: resolve(__dirname, "../../../.env") });

process.env.JWT_SECRET ??= "ci-test-jwt-secret";

const broker = new ServiceBroker({
  ...moleculerConfig,
  nodeID: "production-test",
  logger: false,
  transporter: null
});

let dbAvailable = false;
const tokens = { admin: "", operateur: "", logistique: "", expired: "" };

let seedBomCode = "BOM-SEED-001";
let seedBatchCode = "BATCH-SEED-001";
let seedBatchId: string | null = null;

async function callAction<T>(action: string, params?: Record<string, unknown>): Promise<T> {
  return broker.call(action, params) as Promise<T>;
}

function getErrorCode(error: unknown) {
  const err = error as { data?: { error?: { code?: string } }; code?: string };
  return err?.data?.error?.code || err?.code;
}

function skipIfNoDb(t: { skip: (reason?: string) => void }) {
  if (!dbAvailable) {
    t.skip("PostgreSQL unavailable");
    return true;
  }
  return false;
}

function signTestToken(
  roles: string[],
  options: { sub?: string; email?: string; siteId?: string; expiresIn?: number | string } = {}
) {
  return jwt.sign(
    {
      sub: options.sub || "test-user",
      email: options.email || `${roles.join("-")}@aeronexis.test`,
      siteId: options.siteId || "SITE-LYO",
      roles
    },
    process.env.JWT_SECRET!,
    { expiresIn: options.expiresIn ?? "5m" } as SignOptions
  );
}

before(async () => {
  broker.createService(ProductionService);
  await broker.start();

  try {
    const { prisma } = await import("../src/db.js");
    const bom = await prisma.bOMProduct.findFirst({
      where: { bom_code: seedBomCode, deletedAt: null }
    });
    const batch = await prisma.batchProduct.findFirst({
      where: { batch_code: seedBatchCode, deletedAt: null }
    });

    if (bom && batch) {
      seedBatchId = batch.batch_id;
      dbAvailable = true;
    } else {
      console.warn("Skipping production tests: seed data missing.");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("Skipping production tests: PostgreSQL unavailable.", message);
    dbAvailable = false;
  }

  tokens.admin = signTestToken(["admin"]);
  tokens.operateur = signTestToken(["operateur"]);
  tokens.logistique = signTestToken(["logistique"]);
  tokens.expired = signTestToken(["operateur"], { expiresIn: -1 });
});

after(async () => {
  await broker.stop();
});

describe("production.ping", () => {
  it("returns pong", async () => {
    const result = await callAction<string>("production.ping");
    assert.equal(result, "pong");
  });
});

describe("production RBAC", () => {
  it("rejects logistique role on bom.list", async (t) => {
    if (skipIfNoDb(t)) return;
    await assert.rejects(
      () => callAction("production.bom.list", { accessToken: tokens.logistique }),
      (error: unknown) => getErrorCode(error) === "FORBIDDEN"
    );
  });

  it("rejects expired token on bom.list", async (t) => {
    if (skipIfNoDb(t)) return;
    await assert.rejects(
      () => callAction("production.bom.list", { accessToken: tokens.expired }),
      (error: unknown) => getErrorCode(error) === "TOKEN_EXPIRED"
    );
  });
});

describe("production.bom.list", () => {
  it("lists seeded BOMs for operateur", async (t) => {
    if (skipIfNoDb(t)) return;
    const result = await callAction<{ total: number; items: { bom_code: string }[] }>(
      "production.bom.list",
      { accessToken: tokens.operateur }
    );
    assert.ok(result.total >= 1);
    assert.ok(result.items.some((item) => item.bom_code === seedBomCode));
  });
});

describe("production.batch.list", () => {
  it("lists seeded batches for operateur", async (t) => {
    if (skipIfNoDb(t)) return;
    const result = await callAction<{ total: number; items: { batch_code: string }[] }>(
      "production.batch.list",
      { accessToken: tokens.operateur, bom_code: seedBomCode }
    );
    assert.ok(result.total >= 1);
    assert.ok(result.items.some((item) => item.batch_code === seedBatchCode));
  });
});

describe("production.batch.progress", () => {
  it("updates batch progress and records history", async (t) => {
    if (skipIfNoDb(t)) return;
    const updated = await callAction<{ progress: number; status: string }>(
      "production.batch.progress",
      {
        accessToken: tokens.operateur,
        batch_code: seedBatchCode,
        percent: 50
      }
    );
    assert.equal(updated.progress, 50);
    assert.equal(updated.status, "IN_PROGRESS");

    const history = await callAction<{ total: number; items: { action: string }[] }>(
      "production.batch.history",
      { accessToken: tokens.operateur, batch_code: seedBatchCode }
    );
    assert.ok(history.items.some((item) => item.action === "batch.progress"));
  });
});

describe("production.batch.steps.list", () => {
  it("returns default fabrication steps", async (t) => {
    if (skipIfNoDb(t)) return;
    const result = await callAction<{ steps: { step_code: string }[] }>(
      "production.batch.steps.list",
      { accessToken: tokens.operateur, batch_code: seedBatchCode }
    );
    assert.equal(result.steps.length, 3);
    assert.equal(result.steps[0]?.step_code, "STEP-01");
  });
});

describe("production.batch.addAnomalies", () => {
  it("creates an anomaly on a batch", async (t) => {
    if (skipIfNoDb(t)) return;
    assert.ok(seedBatchId);
    const anomaly = await callAction<{ anomaly_code: string; status: string }>(
      "production.batch.addAnomalies",
      {
        accessToken: tokens.operateur,
        batch_id: seedBatchId,
        description: "Defaut dimensionnel detecte"
      }
    );
    assert.ok(anomaly.anomaly_code.startsWith("ANOMALY-"));
    assert.equal(anomaly.status, "OPEN");
  });
});

describe("production.bom.create", () => {
  it("creates a BOM with auto-generated code", async (t) => {
    if (skipIfNoDb(t)) return;
    const bom = await callAction<{ bom_code: string; material_id: string }>(
      "production.bom.create",
      {
        accessToken: tokens.operateur,
        material_id: "MAT-002",
        description: "BOM test",
        quantity: 2
      }
    );
    assert.ok(bom.bom_code.startsWith("BOM-"));
    assert.equal(bom.material_id, "MAT-002");
  });
});

describe("production.product.get", () => {
  it("returns seeded product PROD-001", async (t) => {
    if (skipIfNoDb(t)) return;
    const product = await callAction<{ productCode: string }>("production.product.get", {
      accessToken: tokens.operateur,
      product_code: "PROD-001"
    });
    assert.equal(product.productCode, "PROD-001");
  });
});
