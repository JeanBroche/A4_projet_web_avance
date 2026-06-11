import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { ServiceBroker } from "moleculer";
import jwt, { type SignOptions } from "jsonwebtoken";
import { getErrorCode } from "@aeronexis/services-shared";
import moleculerConfig from "../moleculer.config.js";
import stockService from "../services/stock.service.js";
import { prisma } from "../src/db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });
process.env.JWT_SECRET ??= "ci-test-jwt-secret";
const broker = new ServiceBroker({
  ...moleculerConfig,
  nodeID: "stock-test",
  logger: false,
  transporter: null
});
let dbAvailable = false;
const tokens = { admin: "", logistique: "", commercial: "", direction: "", expired: "" };
let materialAcierId: string | null = null;
let materialTitaneId: string | null = null;
let materialParisAcierId: string | null = null;
const emittedEvents: Array<{ topic: string; payload: Record<string, unknown> }> = [];
let originalEmit: ServiceBroker["emit"] | null = null;
function skipIfNoDb(t: { skip: (reason?: string) => void }) {
  if (!dbAvailable) {
    t.skip("PostgreSQL unavailable");
    return true;
  }
  return false;
}

function signTestToken(
  roles: string[],
  options: { sub?: string; email?: string; siteId?: string | null; expiresIn?: number | string } = {}
) {
  return jwt.sign(
    {
      sub: options.sub || "test-user",
      email: options.email || `${roles.join("-")}@aeronexis.test`,
      siteId: options.siteId || null,
      roles
    },
    process.env.JWT_SECRET!,
    { expiresIn: (options.expiresIn || "5m") as SignOptions["expiresIn"] }
  );
}
before(async () => {
  broker.createService(stockService);
  originalEmit = broker.emit.bind(broker);
  broker.emit = ((topic: string, payload: Record<string, unknown>) => {
    emittedEvents.push({ topic, payload });
    return originalEmit!(topic, payload);
  }) as typeof broker.emit;
  await broker.start();
  try {
    const acier = await prisma.material.findFirst({
      where: { siteCode: "SITE-LYO", code: "MAT-001", deletedAt: null }
    });
    const titane = await prisma.material.findFirst({
      where: { siteCode: "SITE-LYO", code: "MAT-002", deletedAt: null }
    });
    const parisAcier = await prisma.material.findFirst({
      where: { siteCode: "SITE-PAR", code: "MAT-001", deletedAt: null }
    });
    if (acier && titane && parisAcier) {
      materialAcierId = acier.id;
      materialTitaneId = titane.id;
      materialParisAcierId = parisAcier.id;
      dbAvailable = true;
    } else {
      console.warn("Skipping stock tests: seed materials missing.");
    }
  } catch (error) {
    const err = error as Error;
    console.warn("Skipping stock tests: PostgreSQL unavailable.", err?.message);
    dbAvailable = false;
  }
  tokens.admin = signTestToken(["admin"]);
  tokens.logistique = signTestToken(["logistique"], { siteId: "SITE-LYO" });
  tokens.commercial = signTestToken(["commercial"]);
  tokens.direction = signTestToken(["direction"]);
  tokens.expired = signTestToken(["logistique"], { expiresIn: -1 });
});
after(async () => {
  await broker.stop();
});
describe("stock.level", () => {
  it("level.list returns SITE-LYO materials", async (t) => {
    if (skipIfNoDb(t)) return;
    const result = await broker.call("stock.level.list", {
      accessToken: tokens.logistique,
      siteCode: "SITE-LYO"
    });
    assert.ok(Array.isArray(result));
    assert.ok((result as unknown[]).length >= 3);
    for (const level of result as Array<{ siteCode: string; current: number; reserved: number; available: number }>) {
      assert.equal(level.siteCode, "SITE-LYO");
      assert.equal(level.available, Math.max(0, level.current - level.reserved));
    }
  });
  it("level.list refuses calls without a token", async () => {
    await assert.rejects(
      () => broker.call("stock.level.list", {}),
      (error) => getErrorCode(error) === "TOKEN_INVALID"
    );
  });
  it("level.list refuses an expired token", async () => {
    await assert.rejects(
      () => broker.call("stock.level.list", { accessToken: tokens.expired }),
      (error) => getErrorCode(error) === "TOKEN_EXPIRED"
    );
  });
  it("level.consolidate aggregates across sites", async (t) => {
    if (skipIfNoDb(t)) return;
    const result = (await broker.call("stock.level.consolidate", {
      accessToken: tokens.admin
    })) as Array<{ code: string; sites: unknown[] }>;
    const acier = result.find((row) => row.code === "MAT-001");
    assert.ok(acier, "MAT-001 should be consolidated");
    assert.ok(acier.sites.length >= 2, "expected MAT-001 across two sites");
  });
});
describe("stock.movement", () => {
  it("movement.create requires logistique role", async (t) => {
    if (skipIfNoDb(t)) return;
    await assert.rejects(
      () =>
        broker.call("stock.movement.create", {
          accessToken: tokens.commercial,
          materialId: materialAcierId,
          siteCode: "SITE-LYO",
          type: "IN",
          quantity: 1
        }),
      (error) => getErrorCode(error) === "FORBIDDEN"
    );
  });
  it("movement.create IN increases current stock", async (t) => {
    if (skipIfNoDb(t)) return;
    const before = (await broker.call("stock.level.list", {
      accessToken: tokens.logistique,
      siteCode: "SITE-LYO",
      code: "MAT-001"
    })) as Array<{ current: number }>;
    await broker.call("stock.movement.create", {
      accessToken: tokens.logistique,
      materialId: materialAcierId,
      siteCode: "SITE-LYO",
      type: "IN",
      quantity: 5,
      reason: "Test reception"
    });
    const after = (await broker.call("stock.level.list", {
      accessToken: tokens.logistique,
      siteCode: "SITE-LYO",
      code: "MAT-001"
    })) as Array<{ current: number }>;
    assert.equal(after[0].current, before[0].current + 5);
  });
  it("movement.create OUT below stock fails", async (t) => {
    if (skipIfNoDb(t)) return;
    await assert.rejects(
      () =>
        broker.call("stock.movement.create", {
          accessToken: tokens.logistique,
          materialId: materialAcierId,
          siteCode: "SITE-LYO",
          type: "OUT",
          quantity: 999_999
        }),
      (error) => getErrorCode(error) === "INSUFFICIENT_STOCK"
    );
  });
  it("movement.create refuses cross-site access for logistique", async (t) => {
    if (skipIfNoDb(t)) return;
    await assert.rejects(
      () =>
        broker.call("stock.movement.create", {
          accessToken: tokens.logistique,
          materialId: materialParisAcierId,
          siteCode: "SITE-PAR",
          type: "IN",
          quantity: 1
        }),
      (error) => getErrorCode(error) === "FORBIDDEN"
    );
  });
});
describe("stock.reservation", () => {
  it("reservation.create reserves stock and updates available", async (t) => {
    if (skipIfNoDb(t)) return;
    const before = (await broker.call("stock.level.list", {
      accessToken: tokens.logistique,
      siteCode: "SITE-LYO",
      code: "MAT-001"
    })) as Array<{ reserved: number; available: number }>;
    const ofId = `OF-TEST-${Date.now()}`;
    const created = (await broker.call("stock.reservation.create", {
      accessToken: tokens.logistique,
      ofId,
      lines: [{ materialId: materialAcierId, qty: 3 }]
    })) as { ofId: string; reservations: Array<{ id: string; status: string }> };
    assert.equal(created.reservations.length, 1);
    assert.equal(created.reservations[0].status, "ACTIVE");
    const after = (await broker.call("stock.level.list", {
      accessToken: tokens.logistique,
      siteCode: "SITE-LYO",
      code: "MAT-001"
    })) as Array<{ reserved: number; available: number }>;
    assert.equal(after[0].reserved, before[0].reserved + 3);
    assert.equal(after[0].available, before[0].available - 3);
    const released = (await broker.call("stock.reservation.release", {
      accessToken: tokens.logistique,
      id: created.reservations[0].id
    })) as { status: string };
    assert.equal(released.status, "RELEASED");

    const releasedEvent = emittedEvents.find((event) => event.topic === "stock.released");
    assert.ok(releasedEvent);
    assert.equal(releasedEvent.payload.ofId, ofId);
    assert.equal(releasedEvent.payload.siteCode, "SITE-LYO");
  });
  it("reservation.create fails when qty exceeds available", async (t) => {
    if (skipIfNoDb(t)) return;
    await assert.rejects(
      () =>
        broker.call("stock.reservation.create", {
          accessToken: tokens.logistique,
          ofId: "OF-TEST-OVER",
          lines: [{ materialId: materialAcierId, qty: 10_000_000 }]
        }),
      (error) => getErrorCode(error) === "INSUFFICIENT_STOCK"
    );
  });
  it("reservation.cancel transitions an active reservation", async (t) => {
    if (skipIfNoDb(t)) return;
    const created = (await broker.call("stock.reservation.create", {
      accessToken: tokens.logistique,
      ofId: `OF-TEST-CANCEL-${Date.now()}`,
      lines: [{ materialId: materialAcierId, qty: 1 }]
    })) as { reservations: Array<{ id: string }> };
    const cancelled = (await broker.call("stock.reservation.cancel", {
      accessToken: tokens.logistique,
      id: created.reservations[0].id
    })) as { status: string };
    assert.equal(cancelled.status, "CANCELLED");
    await assert.rejects(
      () =>
        broker.call("stock.reservation.cancel", {
          accessToken: tokens.logistique,
          id: created.reservations[0].id
        }),
      (error) => getErrorCode(error) === "RESERVATION_INACTIVE"
    );
  });
  it("reservation.list filters by ofId and status", async (t) => {
    if (skipIfNoDb(t)) return;
    const ofId = `OF-LIST-${Date.now()}`;
    await broker.call("stock.reservation.create", {
      accessToken: tokens.logistique,
      ofId,
      lines: [{ materialId: materialAcierId, qty: 1 }]
    });
    const listed = (await broker.call("stock.reservation.list", {
      accessToken: tokens.logistique,
      ofId,
      status: "ACTIVE"
    })) as { reservations: Array<{ ofId: string; status: string }> };
    assert.ok(listed.reservations.length >= 1);
    assert.ok(listed.reservations.every((r) => r.ofId === ofId && r.status === "ACTIVE"));
  });
});
describe("stock.alert and threshold", () => {
  it("alert.list returns critical alert for MAT-002", async (t) => {
    if (skipIfNoDb(t)) return;
    const alerts = (await broker.call("stock.alert.list", {
      accessToken: tokens.logistique,
      siteCode: "SITE-LYO"
    })) as Array<{ material?: { code: string } }>;
    assert.ok(alerts.some((alert) => alert.material?.code === "MAT-002"));
  });
  it("alert.list allows direction role", async (t) => {
    if (skipIfNoDb(t)) return;
    const alerts = await broker.call("stock.alert.list", {
      accessToken: tokens.direction,
      siteCode: "SITE-LYO"
    });
    assert.ok(Array.isArray(alerts));
  });
  it("alert.list rejects commercial role", async (t) => {
    if (skipIfNoDb(t)) return;
    await assert.rejects(
      () =>
        broker.call("stock.alert.list", {
          accessToken: tokens.commercial,
          siteCode: "SITE-LYO"
        }),
      (error) => getErrorCode(error) === "FORBIDDEN"
    );
  });
  it("threshold.upsert updates minimumStock", async (t) => {
    if (skipIfNoDb(t)) return;
    const result = (await broker.call("stock.threshold.upsert", {
      accessToken: tokens.logistique,
      materialId: materialTitaneId,
      minimumStock: 1
    })) as { material: { minimum: number } };
    assert.equal(result.material.minimum, 1);
  });
});
describe("stock.forecast", () => {
  it("forecast.rupture returns scored materials", async (t) => {
    if (skipIfNoDb(t)) return;
    const forecast = (await broker.call("stock.forecast.rupture", {
      accessToken: tokens.logistique,
      siteCode: "SITE-LYO"
    })) as Array<{ score: number }>;
    assert.ok(Array.isArray(forecast));
    assert.ok(forecast.length >= 1);
    for (let i = 1; i < forecast.length; i++) {
      assert.ok(forecast[i - 1].score >= forecast[i].score, "results must be sorted by score desc");
    }
  });
});
describe("stock.supplier.delay", () => {
  it("supplier.delay.notify creates a delay record", async (t) => {
    if (skipIfNoDb(t)) return;
    const delay = (await broker.call("stock.supplier.delay.notify", {
      accessToken: tokens.logistique,
      materialId: materialTitaneId,
      supplier: "AeroMat FR",
      expectedDate: new Date().toISOString(),
      notes: "Test delay"
    })) as { id: string; supplier: string };
    assert.ok(delay.id);
    assert.equal(delay.supplier, "AeroMat FR");
  });
  it("supplier.delay.list filters by material", async (t) => {
    if (skipIfNoDb(t)) return;
    const list = (await broker.call("stock.supplier.delay.list", {
      accessToken: tokens.logistique,
      materialId: materialTitaneId
    })) as Array<{ materialId: string }>;
    assert.ok(list.length >= 1);
    for (const entry of list) {
      assert.equal(entry.materialId, materialTitaneId);
    }
  });
  it("supplier.delay.notify refuses commercial role", async (t) => {
    if (skipIfNoDb(t)) return;
    await assert.rejects(
      () =>
        broker.call("stock.supplier.delay.notify", {
          accessToken: tokens.commercial,
          materialId: materialTitaneId,
          supplier: "AeroMat FR",
          expectedDate: new Date().toISOString()
        }),
      (error) => getErrorCode(error) === "FORBIDDEN"
    );
  });
});