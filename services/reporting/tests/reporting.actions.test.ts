import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { ServiceBroker } from "moleculer";
import jwt, { type SignOptions } from "jsonwebtoken";
import { getErrorCode } from "@aeronexis/services-shared";
import moleculerConfig from "../moleculer.config.js";
import ReportingService from "../services/reporting.service.js";
import { getKpiConfig } from "../src/lib/kpi-config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });

process.env.JWT_SECRET ??= "ci-test-jwt-secret";
delete process.env.REDIS_URL;

const broker = new ServiceBroker({
  ...moleculerConfig,
  nodeID: "reporting-test",
  logger: false,
  transporter: null
});

const tokens = {
  direction: "",
  commercial: "",
  admin: ""
};

let lastBatchListParams: Record<string, unknown> = {};

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

async function callAction<T>(action: string, params?: Record<string, unknown>): Promise<T> {
  return broker.call(action, params) as Promise<T>;
}

const FIXED_NOW = new Date();
const dayMs = 24 * 60 * 60 * 1000;
const inPast = (days: number) => new Date(FIXED_NOW.getTime() - days * dayMs);
const inFuture = (days: number) => new Date(FIXED_NOW.getTime() + days * dayMs);

let historyOrders: Array<Record<string, unknown>> = [];

before(async () => {
  historyOrders = [
    {
      id: "h1",
      orderNumber: "CMD-100",
      status: "VALIDATED",
      isUrgent: false,
      totalAmount: 150_000,
      dueDate: inPast(2).toISOString(),
      promisedDeliveryDate: null,
      createdAt: inPast(5).toISOString(),
      lines: []
    },
    {
      id: "h2",
      orderNumber: "CMD-101",
      status: "IN_PRODUCTION",
      isUrgent: false,
      totalAmount: 250_000,
      dueDate: inFuture(3).toISOString(),
      promisedDeliveryDate: inFuture(3).toISOString(),
      createdAt: inPast(10).toISOString(),
      lines: []
    },
    {
      id: "h3",
      orderNumber: "CMD-102",
      status: "DELIVERED",
      isUrgent: false,
      totalAmount: 90_000,
      dueDate: inPast(1).toISOString(),
      promisedDeliveryDate: inPast(1).toISOString(),
      createdAt: inPast(8).toISOString(),
      lines: []
    }
  ];

  broker.createService({
    name: "stock",
    actions: {
      "level.list": {
        handler() {
          return [
            { materialId: "MAT-1", code: "M1", siteCode: "SITE-LYO", available: 0 },
            { materialId: "MAT-2", code: "M2", siteCode: "SITE-LYO", available: 12 },
            { materialId: "MAT-3", code: "M3", siteCode: "SITE-LYO", available: 0 }
          ];
        }
      },
      "forecast.rupture": {
        handler() {
          return [
            {
              materialId: "MAT-1",
              code: "M1",
              siteCode: "SITE-LYO",
              available: 100,
              minimum: 50,
              consumptionPerDay: 10,
              estimatedDaysToRupture: 5,
              score: 85
            },
            {
              materialId: "MAT-2",
              code: "M2",
              siteCode: "SITE-LYO",
              available: 200,
              minimum: 20,
              consumptionPerDay: 4,
              estimatedDaysToRupture: 45,
              score: 30
            }
          ];
        }
      }
    }
  });

  broker.createService({
    name: "order",
    actions: {
      "order.listUrgent": {
        handler() {
          return [
            {
              id: "o1",
              orderNumber: "CMD-001",
              status: "VALIDATED",
              isUrgent: true,
              totalAmount: 100_000,
              dueDate: inFuture(2).toISOString(),
              promisedDeliveryDate: inFuture(2).toISOString(),
              createdAt: inPast(1).toISOString()
            },
            {
              id: "o2",
              orderNumber: "CMD-002",
              status: "IN_PRODUCTION",
              isUrgent: true,
              totalAmount: 80_000,
              dueDate: inFuture(5).toISOString(),
              promisedDeliveryDate: inFuture(5).toISOString(),
              createdAt: inPast(3).toISOString()
            }
          ];
        }
      },
      "order.history": {
        handler(ctx) {
          const limit = Number(ctx.params.limit ?? 100);
          const offset = Number(ctx.params.offset ?? 0);
          const items = historyOrders.slice(offset, offset + limit);
          return { total: historyOrders.length, limit, offset, items };
        }
      }
    }
  });

  broker.createService({
    name: "production",
    actions: {
      "batch.list": {
        handler(ctx) {
          lastBatchListParams = ctx.params as Record<string, unknown>;
          const items = [
            {
              batch_id: "b1",
              batch_code: "BATCH-001",
              status: "IN_PROGRESS",
              progress: 60,
              plannedStartAt: inPast(2).toISOString(),
              plannedEndAt: inFuture(3).toISOString()
            },
            {
              batch_id: "b2",
              batch_code: "BATCH-002",
              status: "IN_PROGRESS",
              progress: 40,
              plannedStartAt: inPast(5).toISOString(),
              plannedEndAt: inPast(1).toISOString()
            },
            {
              batch_id: "b3",
              batch_code: "BATCH-003",
              status: "COMPLETED",
              progress: 100,
              plannedStartAt: inPast(10).toISOString(),
              plannedEndAt: inPast(2).toISOString()
            }
          ];
          return { total: items.length, limit: 500, offset: 0, items };
        }
      }
    }
  });

  broker.createService(ReportingService);
  await broker.start();

  tokens.direction = signTestToken(["direction"]);
  tokens.commercial = signTestToken(["commercial"]);
  tokens.admin = signTestToken(["admin"]);
});

after(async () => {
  await broker.stop();
});

describe("reporting.ping", () => {
  it("returns pong", async () => {
    const result = await callAction<string>("reporting.ping");
    assert.equal(result, "pong");
  });
});

describe("RBAC", () => {
  it("rejects commercial role on direction-only actions", async () => {
    try {
      await callAction("reporting.calcul.logistique.rupture", {
        accessToken: tokens.commercial,
        siteCode: "SITE-LYO"
      });
      assert.fail("expected FORBIDDEN");
    } catch (error) {
      assert.equal(getErrorCode(error), "FORBIDDEN");
    }
  });

  it("rejects missing token", async () => {
    try {
      await callAction("reporting.calcul.finance.margin", {});
      assert.fail("expected TOKEN_INVALID");
    } catch (error) {
      assert.equal(getErrorCode(error), "TOKEN_INVALID");
    }
  });

  it("admin bypasses direction-only actions", async () => {
    const result = await callAction<{ totalRuptureProducts: number }>(
      "reporting.calcul.logistique.rupture",
      { accessToken: tokens.admin, siteCode: "SITE-LYO" }
    );
    assert.equal(result.totalRuptureProducts, 2);
  });
});

describe("calcul.logistique", () => {
  it("rupture counts materials with available <= 0", async () => {
    const result = await callAction<{
      totalRuptureProducts: number;
      materials: Array<{ materialId: string; available: number }>;
    }>("reporting.calcul.logistique.rupture", {
      accessToken: tokens.direction,
      siteCode: "SITE-LYO"
    });
    assert.equal(result.totalRuptureProducts, 2);
    assert.deepEqual(
      result.materials.map((m) => m.materialId),
      ["MAT-1", "MAT-3"]
    );
    assert.ok(result.materials.every((m) => m.available <= 0));
  });

  it("rotation aggregates consumptionPerDay and lists risk materials", async () => {
    const result = await callAction<{
      windowDays: number;
      totalMaterials: number;
      averageConsumptionPerDay: number;
      atRiskMaterials: Array<{ materialId: string; score: number }>;
    }>("reporting.calcul.logistique.rotation", {
      accessToken: tokens.direction,
      siteCode: "SITE-LYO",
      windowDays: 30
    });
    assert.equal(result.totalMaterials, 2);
    assert.equal(result.averageConsumptionPerDay, 7);
    assert.equal(result.atRiskMaterials.length, 1);
    assert.equal(result.atRiskMaterials[0]?.materialId, "MAT-1");
  });
});

describe("calcul.commerciaux", () => {
  it("urgentOrders returns count and orders", async () => {
    const result = await callAction<{
      totalUrgentOrders: number;
      orders: Array<{ orderNumber: string }>;
    }>("reporting.calcul.commerciaux.urgentOrders", {
      accessToken: tokens.direction
    });
    assert.equal(result.totalUrgentOrders, 2);
    assert.deepEqual(
      result.orders.map((o) => o.orderNumber),
      ["CMD-001", "CMD-002"]
    );
  });

  it("delayRiskOrders uses shared delay scoring with promisedDeliveryDate", async () => {
    const config = getKpiConfig();
    const result = await callAction<{
      totalDelayRiskOrders: number;
      scoreThreshold: number;
      orders: Array<{ orderNumber: string; score: number }>;
    }>("reporting.calcul.commerciaux.delayRiskOrders", {
      accessToken: tokens.direction,
      windowDays: 30
    });
    assert.equal(result.scoreThreshold, config.delayRiskScoreThreshold);
    assert.equal(result.totalDelayRiskOrders, 2);
    assert.deepEqual(
      result.orders.map((o) => o.orderNumber).sort(),
      ["CMD-100", "CMD-101"]
    );
    assert.ok(result.orders.every((o) => o.score >= config.delayRiskScoreThreshold));
  });
});

describe("calcul.finance", () => {
  it("margin uses target margin rate from config", async () => {
    const config = getKpiConfig();
    const result = await callAction<{
      totalRevenue: number;
      estimatedCost: number;
      margin: number;
      targetMarginRate: number;
      costRatio: number;
    }>("reporting.calcul.finance.margin", {
      accessToken: tokens.direction,
      windowDays: 30
    });
    assert.equal(result.totalRevenue, 490_000);
    assert.equal(result.targetMarginRate, config.targetMarginRate);
    assert.equal(result.costRatio, 1 - config.targetMarginRate);
    assert.equal(result.estimatedCost, Math.round(490_000 * result.costRatio));
    assert.equal(result.margin, 490_000 - result.estimatedCost);
  });

  it("totalDelay applies variable penalty from days late and revenue", async () => {
    const config = getKpiConfig();
    const result = await callAction<{
      totalDelays: number;
      estimatedDelayCost: number;
      orders: Array<{ orderNumber: string; daysLate: number; penalty: number }>;
    }>("reporting.calcul.finance.totalDelay", {
      accessToken: tokens.direction,
      windowDays: 30
    });
    assert.equal(result.totalDelays, 1);
    assert.equal(result.orders[0]?.orderNumber, "CMD-100");
    const daysLate = result.orders[0]?.daysLate ?? 0;
    assert.ok(daysLate >= 2);
    assert.equal(
      result.estimatedDelayCost,
      Math.round(
        config.delayPenaltyBaseCentimes +
          daysLate * config.delayPenaltyPerDayCentimes +
          150_000 * config.delayPenaltyRevenueRatio
      )
    );
    assert.equal(result.orders[0]?.penalty, result.estimatedDelayCost);
  });
});

describe("calcul.production", () => {
  it("avancement averages progress of active batches only", async () => {
    const result = await callAction<{
      totalActiveBatches: number;
      averageProgress: number;
    }>("reporting.calcul.production.avancement", {
      accessToken: tokens.direction,
      siteCode: "SITE-LYO"
    });
    assert.equal(result.totalActiveBatches, 2);
    assert.equal(result.averageProgress, 50);
    assert.equal(lastBatchListParams.siteCode, "SITE-LYO");
  });

  it("retardLots lists active batches past plannedEndAt", async () => {
    const result = await callAction<{
      lateBatches: number;
      batches: Array<{ batch_code: string }>;
    }>("reporting.calcul.production.retardLots", {
      accessToken: tokens.direction,
      siteCode: "SITE-PAR"
    });
    assert.equal(result.lateBatches, 1);
    assert.equal(result.batches[0]?.batch_code, "BATCH-002");
    assert.equal(lastBatchListParams.siteCode, "SITE-PAR");
  });
});
