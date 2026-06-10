import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { ServiceBroker } from "moleculer";
import jwt, { type SignOptions } from "jsonwebtoken";
import moleculerConfig from "../moleculer.config.js";
import OrderService from "../services/order.service.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

config({ path: resolve(__dirname, "../../../.env") });

process.env.JWT_SECRET ??= "ci-test-jwt-secret";

const broker = new ServiceBroker({
  ...moleculerConfig,
  nodeID: "order-test",
  logger: false,
  transporter: null
});

let dbAvailable = false;

const tokens = { admin: "", logistique: "", commercial: "", expired: "" };

let clientId: string | null = null;
let draftOrderId: string | null = null;
let urgentOrderId: string | null = null;
let parisDraftOrderId: string | null = null;

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
  broker.createService(OrderService);
  await broker.start();

  try {
    const { prisma } = await import("../src/db.js");
    const client = await prisma.client.findFirst({
      where: { code: "CLI-001", deletedAt: null }
    });
    const draftOrder = await prisma.customerOrder.findFirst({
      where: { orderNumber: "CMD-2025-00001", deletedAt: null }
    });
    const urgentOrder = await prisma.customerOrder.findFirst({
      where: { orderNumber: "CMD-2025-00002", deletedAt: null }
    });
    const parisOrder = await prisma.customerOrder.findFirst({
      where: { orderNumber: "CMD-PAR-00001", deletedAt: null }
    });

    if (client && draftOrder && urgentOrder && parisOrder) {
      clientId = client.id;
      draftOrderId = draftOrder.id;
      urgentOrderId = urgentOrder.id;
      parisDraftOrderId = parisOrder.id;
      dbAvailable = true;
    } else {
      console.warn("Skipping order tests: seed data missing.");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("Skipping order tests: PostgreSQL unavailable.", message);
    dbAvailable = false;
  }

  tokens.admin = signTestToken(["admin"]);
  tokens.logistique = signTestToken(["logistique"]);
  tokens.commercial = signTestToken(["commercial"]);
  tokens.expired = signTestToken(["commercial"], { expiresIn: -1 });
});

after(async () => {
  await broker.stop();
});

describe("order.ping", () => {
  it("returns pong", async () => {
    const result = await callAction<string>("order.ping");
    assert.equal(result, "pong");
  });
});

describe("order.order.create", () => {
  it("creates a draft order with lines", async (t) => {
    if (skipIfNoDb(t)) return;

    const order = await callAction<{
      id: string;
      orderNumber: string;
      status: string;
      lines: unknown[];
      totalAmount: number;
    }>("order.order.create", {
      accessToken: tokens.commercial,
      clientId,
      siteCode: "SITE-LYO",
      promisedDeliveryDate: new Date(Date.now() + 7 * 86400000).toISOString(),
      lines: [
        {
          productCode: "PROD-TEST",
          description: "Test product",
          quantity: 1,
          unitPrice: 10000
        }
      ]
    });

    assert.ok(order.id);
    assert.match(order.orderNumber, /^CMD-\d{4}-\d{5}$/);
    assert.equal(order.status, "DRAFT");
    assert.equal(order.lines.length, 1);
    assert.equal(order.totalAmount, 10000);
  });

  it("refuses logistique role", async (t) => {
    if (skipIfNoDb(t)) return;

    await assert.rejects(
      () =>
        callAction("order.order.create", {
          accessToken: tokens.logistique,
          clientId,
          siteCode: "SITE-LYO",
          lines: [{ productCode: "PROD-001", quantity: 1 }]
        }),
      (error) => getErrorCode(error) === "FORBIDDEN"
    );
  });

  it("refuses calls without token", async () => {
    await assert.rejects(
      () =>
        callAction("order.order.create", {
          clientId: "x",
          siteCode: "SITE-LYO",
          lines: [{ productCode: "PROD-001", quantity: 1 }]
        }),
      (error) => getErrorCode(error) === "TOKEN_INVALID"
    );
  });
});

describe("order.order.get and status", () => {
  it("returns order details", async (t) => {
    if (skipIfNoDb(t)) return;

    const order = await callAction<{ id: string; orderNumber: string; client: unknown }>(
      "order.order.get",
      {
        accessToken: tokens.commercial,
        orderId: draftOrderId
      }
    );

    assert.equal(order.id, draftOrderId);
    assert.equal(order.orderNumber, "CMD-2025-00001");
    assert.ok(order.client);
  });

  it("returns status timeline", async (t) => {
    if (skipIfNoDb(t)) return;

    const status = await callAction<{
      orderId: string;
      currentStatus: string;
      history: unknown[];
    }>("order.order.status", {
      accessToken: tokens.commercial,
      orderId: draftOrderId
    });

    assert.equal(status.orderId, draftOrderId);
    assert.equal(status.currentStatus, "DRAFT");
    assert.ok(status.history.length >= 1);
  });

  it("allows commercial read access", async (t) => {
    if (skipIfNoDb(t)) return;

    const order = await callAction<{ id: string }>("order.order.get", {
      accessToken: tokens.commercial,
      orderId: draftOrderId
    });

    assert.ok(order.id);
  });
});

describe("order.order.validate and reject", () => {
  it("validates a draft order", async (t) => {
    if (skipIfNoDb(t)) return;

    const created = await callAction<{ id: string }>("order.order.create", {
      accessToken: tokens.commercial,
      clientId,
      siteCode: "SITE-LYO",
      lines: [{ productCode: "PROD-VAL", quantity: 1, unitPrice: 5000 }]
    });

    const validated = await callAction<{ status: string }>("order.order.validate", {
      accessToken: tokens.commercial,
      orderId: created.id,
      notes: "Approved for production"
    });

    assert.equal(validated.status, "VALIDATED");

    await assert.rejects(
      () =>
        callAction("order.order.validate", {
          accessToken: tokens.commercial,
          orderId: created.id
        }),
      (error) => getErrorCode(error) === "INVALID_STATUS_TRANSITION"
    );
  });

  it("rejects without reason fails validation", async (t) => {
    if (skipIfNoDb(t)) return;

    const created = await callAction<{ id: string }>("order.order.create", {
      accessToken: tokens.commercial,
      clientId,
      siteCode: "SITE-LYO",
      lines: [{ productCode: "PROD-REJ", quantity: 1 }]
    });

    await assert.rejects(
      () =>
        callAction("order.order.reject", {
          accessToken: tokens.commercial,
          orderId: created.id
        }),
      (error) => getErrorCode(error) === "VALIDATION_ERROR"
    );
  });

  it("rejects a draft order with reason", async (t) => {
    if (skipIfNoDb(t)) return;

    const created = await callAction<{ id: string }>("order.order.create", {
      accessToken: tokens.commercial,
      clientId,
      siteCode: "SITE-LYO",
      lines: [{ productCode: "PROD-REJ2", quantity: 1 }]
    });

    const rejected = await callAction<{ status: string }>("order.order.reject", {
      accessToken: tokens.commercial,
      orderId: created.id,
      reason: "Missing client approval"
    });

    assert.equal(rejected.status, "REJECTED");
  });

  it("validate refuses logistique role", async (t) => {
    if (skipIfNoDb(t)) return;

    await assert.rejects(
      () =>
        callAction("order.order.validate", {
          accessToken: tokens.logistique,
          orderId: draftOrderId
        }),
      (error) => getErrorCode(error) === "FORBIDDEN"
    );
  });

  it("validate refuses cross-site access for commercial", async (t) => {
    if (skipIfNoDb(t)) return;

    await assert.rejects(
      () =>
        callAction("order.order.validate", {
          accessToken: tokens.commercial,
          orderId: parisDraftOrderId
        }),
      (error) => getErrorCode(error) === "FORBIDDEN"
    );
  });
});

describe("order.order.priority", () => {
  it("setPriority updates urgent flag", async (t) => {
    if (skipIfNoDb(t)) return;

    const dueDate = new Date(Date.now() + 2 * 86400000).toISOString();
    const updated = await callAction<{ isUrgent: boolean; dueDate: unknown }>(
      "order.order.setPriority",
      {
        accessToken: tokens.commercial,
        orderId: draftOrderId,
        isUrgent: true,
        dueDate
      }
    );

    assert.equal(updated.isUrgent, true);
    assert.ok(updated.dueDate);
  });

  it("listUrgent includes urgent orders", async (t) => {
    if (skipIfNoDb(t)) return;

    const urgent = await callAction<{ id: string; isUrgent: boolean }[]>(
      "order.order.listUrgent",
      {
        accessToken: tokens.commercial,
        siteCode: "SITE-LYO"
      }
    );

    assert.ok(Array.isArray(urgent));
    assert.ok(urgent.some((order) => order.id === urgentOrderId || order.isUrgent));
  });
});

describe("order.order.delayRisk", () => {
  it("returns score and factors", async (t) => {
    if (skipIfNoDb(t)) return;

    const risk = await callAction<{
      orderId: string;
      score: number;
      factors: string[];
    }>("order.order.delayRisk", {
      accessToken: tokens.commercial,
      orderId: urgentOrderId
    });

    assert.equal(risk.orderId, urgentOrderId);
    assert.ok(typeof risk.score === "number");
    assert.ok(risk.score >= 0 && risk.score <= 100);
    assert.ok(Array.isArray(risk.factors));
    assert.ok(risk.factors.length >= 1);
  });
});

describe("order.client.stats and order.history", () => {
  it("returns client stats", async (t) => {
    if (skipIfNoDb(t)) return;

    const stats = await callAction<{
      clientId: string;
      stats: { orderCount: number; totalRevenue: number };
    }>("order.client.stats", {
      accessToken: tokens.commercial,
      clientId
    });

    assert.equal(stats.clientId, clientId);
    assert.ok(stats.stats.orderCount >= 2);
    assert.ok(typeof stats.stats.totalRevenue === "number");
  });

  it("returns paginated order history", async (t) => {
    if (skipIfNoDb(t)) return;

    const history = await callAction<{ total: number; items: unknown[] }>(
      "order.order.history",
      {
        accessToken: tokens.commercial,
        clientId,
        limit: 10,
        offset: 0
      }
    );

    assert.ok(history.total >= 2);
    assert.ok(Array.isArray(history.items));
    assert.ok(history.items.length >= 2);
  });
});

describe("order auth edge cases", () => {
  it("refuses expired token", async () => {
    await assert.rejects(
      () =>
        callAction("order.order.get", {
          accessToken: tokens.expired,
          orderId: "x"
        }),
      (error) => getErrorCode(error) === "TOKEN_EXPIRED"
    );
  });
});
