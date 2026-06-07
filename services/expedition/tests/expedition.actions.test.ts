import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { ServiceBroker } from "moleculer";
import jwt, { type SignOptions } from "jsonwebtoken";
import moleculerConfig from "../moleculer.config.js";
import ExpeditionService from "../services/expedition.service.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

config({ path: resolve(__dirname, "../../../.env") });

process.env.JWT_SECRET ??= "ci-test-jwt-secret";

const broker = new ServiceBroker({
  ...moleculerConfig,
  nodeID: "expedition-test",
  logger: false,
  transporter: null
});

let dbAvailable = false;
const tokens = { admin: "", logistique: "", commercial: "", expired: "" };

let seedShipmentId: string | null = null;
let seedPickListId: string | null = null;

async function callAction<T>(action: string, params?: Record<string, unknown>): Promise<T> {
  return broker.call(action, params) as Promise<T>;
}

function getErrorCode(error: unknown) {
  const err = error as { data?: { error?: { code?: string } }; code?: string };
  return err?.data?.error?.code || err?.code;
}

function skipIfNoDb(t: { skip: (reason: string) => void }) {
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
  broker.createService({
    name: "stock",
    actions: {
      "reservation.list": {
        handler() {
          return {
            reservations: [{ ofId: "OF-SEED-001", status: "ACTIVE", quantity: 10 }]
          };
        }
      }
    }
  });

  broker.createService(ExpeditionService);
  await broker.start();

  try {
    const { prisma } = await import("../src/db.js");
    const shipment = await prisma.shipment.findFirst({
      where: { code: "SHP-2025-00001", deletedAt: null }
    });
    const pickList = await prisma.pickList.findFirst({
      where: { code: "PICK-2025-00001", deletedAt: null }
    });

    if (shipment && pickList) {
      seedShipmentId = shipment.id;
      seedPickListId = pickList.id;
      dbAvailable = true;
    } else {
      console.warn("Skipping expedition tests: seed data missing.");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("Skipping expedition tests: PostgreSQL unavailable.", message);
    dbAvailable = false;
  }

  tokens.admin = signTestToken(["admin"]);
  tokens.logistique = signTestToken(["logistique"]);
  tokens.commercial = signTestToken(["commercial"]);
  tokens.expired = signTestToken(["logistique"], { expiresIn: -1 });
});

after(async () => {
  await broker.stop();
});

describe("expedition.ping", () => {
  it("returns pong", async () => {
    const result = await callAction<string>("expedition.ping");
    assert.equal(result, "pong");
  });
});

describe("expedition.picklist.create", () => {
  it("creates a pick list with lines", async (t) => {
    if (skipIfNoDb(t)) return;

    const orderNumber = `CMD-TEST-${Date.now()}`;
    const result = await callAction<{ pickList: { id: string; status: string; lines: unknown[] } }>(
      "expedition.picklist.create",
      {
        accessToken: tokens.logistique,
        orderNumber,
        siteCode: "SITE-LYO",
        ofId: "OF-SEED-001",
        clientCode: "CLI-001",
        lines: [{ productCode: "PROD-001", quantity: 3 }]
      }
    );

    assert.equal(result.pickList.status, "PENDING");
    assert.equal(result.pickList.lines.length, 1);
  });

  it("rejects commercial role on write", async (t) => {
    if (skipIfNoDb(t)) return;

    await assert.rejects(
      () =>
        callAction("expedition.picklist.create", {
          accessToken: tokens.commercial,
          orderNumber: "CMD-FORBIDDEN",
          siteCode: "SITE-LYO",
          lines: [{ productCode: "PROD-001", quantity: 1 }]
        }),
      (error: unknown) => getErrorCode(error) === "FORBIDDEN"
    );
  });
});

describe("expedition.picklist.complete", () => {
  it("completes a pending pick list", async (t) => {
    if (skipIfNoDb(t)) return;

    const created = await callAction<{ pickList: { id: string } }>("expedition.picklist.create", {
      accessToken: tokens.logistique,
      orderNumber: `CMD-COMPLETE-${Date.now()}`,
      siteCode: "SITE-LYO",
      ofId: "OF-SEED-001",
      lines: [{ productCode: "PROD-002", quantity: 1 }]
    });

    const completed = await callAction<{ pickList: { status: string } }>(
      "expedition.picklist.complete",
      {
        accessToken: tokens.logistique,
        id: created.pickList.id
      }
    );

    assert.equal(completed.pickList.status, "COMPLETED");
  });
});

describe("expedition.shipment", () => {
  it("plans a shipment from completed pick list", async (t) => {
    if (skipIfNoDb(t)) return;

    const pickList = await callAction<{ pickList: { id: string } }>("expedition.picklist.create", {
      accessToken: tokens.logistique,
      orderNumber: `CMD-PLAN-${Date.now()}`,
      siteCode: "SITE-LYO",
      lines: [{ productCode: "PROD-003", quantity: 1 }]
    });

    await callAction("expedition.picklist.complete", {
      accessToken: tokens.logistique,
      id: pickList.pickList.id
    });

    const planned = await callAction<{ shipment: { status: string; code: string } }>(
      "expedition.shipment.plan",
      {
        accessToken: tokens.logistique,
        pickListId: pickList.pickList.id,
        carrier: "DHL"
      }
    );

    assert.equal(planned.shipment.status, "PLANNED");
    assert.match(planned.shipment.code, /^SHP-/);
  });

  it("gets shipment with tracking events", async (t) => {
    if (skipIfNoDb(t)) return;
    if (!seedShipmentId) {
      t.skip("Seed shipment missing");
      return;
    }

    const result = await callAction<{
      shipment: { id: string; trackingEvents: unknown[] };
    }>("expedition.shipment.get", {
      accessToken: tokens.logistique,
      id: seedShipmentId
    });

    assert.equal(result.shipment.id, seedShipmentId);
    assert.ok(result.shipment.trackingEvents.length >= 1);
  });

  it("returns tracking timeline", async (t) => {
    if (skipIfNoDb(t)) return;
    if (!seedShipmentId) {
      t.skip("Seed shipment missing");
      return;
    }

    const result = await callAction<{ timeline: unknown[]; status: string }>(
      "expedition.shipment.track",
      {
        accessToken: tokens.logistique,
        id: seedShipmentId
      }
    );

    assert.ok(result.timeline.length >= 1);
    assert.equal(result.status, "PLANNED");
  });

  it("updates shipment status with valid transition", async (t) => {
    if (skipIfNoDb(t)) return;

    const pickList = await callAction<{ pickList: { id: string } }>("expedition.picklist.create", {
      accessToken: tokens.logistique,
      orderNumber: `CMD-STATUS-${Date.now()}`,
      siteCode: "SITE-LYO",
      lines: [{ productCode: "PROD-004", quantity: 1 }]
    });

    await callAction("expedition.picklist.complete", {
      accessToken: tokens.logistique,
      id: pickList.pickList.id
    });

    const planned = await callAction<{ shipment: { id: string } }>("expedition.shipment.plan", {
      accessToken: tokens.logistique,
      pickListId: pickList.pickList.id
    });

    const picked = await callAction<{ shipment: { status: string } }>(
      "expedition.shipment.updateStatus",
      {
        accessToken: tokens.logistique,
        id: planned.shipment.id,
        status: "PICKED"
      }
    );

    assert.equal(picked.shipment.status, "PICKED");
  });

  it("rejects invalid status transition", async (t) => {
    if (skipIfNoDb(t)) return;
    if (!seedShipmentId) {
      t.skip("Seed shipment missing");
      return;
    }

    await assert.rejects(
      () =>
        callAction("expedition.shipment.updateStatus", {
          accessToken: tokens.logistique,
          id: seedShipmentId,
          status: "DELIVERED"
        }),
      (error: unknown) => getErrorCode(error) === "INVALID_STATUS_TRANSITION"
    );
  });

  it("lists shipment history with pagination", async (t) => {
    if (skipIfNoDb(t)) return;

    const result = await callAction<{
      items: unknown[];
      pagination: { page: number; total: number };
    }>("expedition.shipment.history", {
      accessToken: tokens.logistique,
      siteCode: "SITE-LYO",
      page: 1,
      pageSize: 10
    });

    assert.ok(result.items.length >= 1);
    assert.equal(result.pagination.page, 1);
    assert.ok(result.pagination.total >= 1);
  });
});

describe("expedition.events", () => {
  it("auto-creates pick list on commande.order.finished", async (t) => {
    if (skipIfNoDb(t)) return;

    const orderNumber = `CMD-EVENT-${Date.now()}`;
    await broker.emit("commande.order.finished", {
      orderNumber,
      siteCode: "SITE-LYO",
      clientCode: "CLI-001",
      ofId: "OF-EVENT-001",
      lines: [{ productCode: "PROD-EVT", quantity: 2 }]
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    const { prisma } = await import("../src/db.js");
    const pickList = await prisma.pickList.findFirst({
      where: { orderNumber, deletedAt: null }
    });

    assert.ok(pickList);
    assert.equal(pickList.status, "PENDING");
  });
});
