import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { ServiceBroker } from "moleculer";
import jwt, { type SignOptions } from "jsonwebtoken";
import moleculerConfig from "../moleculer.config.js";
import auditService from "../services/audit.service.js";
import { connectMongo, disconnectMongo, getDb } from "../src/db.js";
import { COLLECTIONS } from "../src/db.js";
import { DEMO_LOT_ID } from "../src/lib/audit-helpers.js";
import type { UserActionLoggedPayload } from "@aeronexis/shared";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });
process.env.JWT_SECRET ??= "ci-test-jwt-secret";

const broker = new ServiceBroker({
  ...moleculerConfig,
  nodeID: "audit-test",
  logger: false,
  transporter: null
});

let mongoAvailable = false;
let adminToken = "";
let commercialToken = "";

function getErrorCode(error: unknown) {
  const err = error as { data?: { error?: { code?: string } }; code?: string };
  return err?.data?.error?.code || err?.code;
}

function skipIfNoMongo(t: { skip: (reason?: string) => void }) {
  if (!mongoAvailable) {
    t.skip("MongoDB unavailable");
    return true;
  }
  return false;
}

function signTestToken(
  roles: string[],
  options: { sub?: string; email?: string; siteId?: string | null } = {}
) {
  return jwt.sign(
    {
      sub: options.sub || "test-user",
      email: options.email || `${roles.join("-")}@aeronexis.test`,
      siteId: options.siteId ?? "SITE-LYO",
      roles
    },
    process.env.JWT_SECRET!,
    { expiresIn: "5m" as SignOptions["expiresIn"] }
  );
}

async function callAction<T>(action: string, params: Record<string, unknown> = {}) {
  return broker.call(action, params) as Promise<T>;
}

before(async () => {
  try {
    await connectMongo();
    mongoAvailable = true;
  } catch {
    mongoAvailable = false;
    return;
  }

  broker.createService(auditService);
  await broker.start();

  adminToken = signTestToken(["admin"], { sub: "admin-user", email: "admin@aeronexis.test" });
  commercialToken = signTestToken(["commercial"], {
    sub: "commercial-user",
    email: "commercial@aeronexis.test"
  });

  const db = getDb();
  await db.collection(COLLECTIONS.auditLogs).deleteMany({ entity: "AuditTestEntity" });
});

after(async () => {
  if (mongoAvailable) {
    await broker.stop().catch(() => {});
  }
  await disconnectMongo().catch(() => {});
});

describe("audit.ping", () => {
  it("returns pong", async (t) => {
    if (skipIfNoMongo(t)) return;
    const result = await callAction<string>("audit.ping");
    assert.equal(result, "pong");
  });
});

describe("audit.change.list", () => {
  it("lists audit logs after user.action.logged event", async (t) => {
    if (skipIfNoMongo(t)) return;

    const payload: UserActionLoggedPayload = {
      action: "audit.test.update",
      actorId: "admin-user",
      actorEmail: "admin@aeronexis.test",
      entity: "AuditTestEntity",
      entityId: "entity-1",
      diff: { before: { status: "draft" }, after: { status: "validated" } },
      siteCode: "SITE-LYO",
      timestamp: new Date().toISOString()
    };

    await broker.emit("user.action.logged", payload);

    const result = await callAction<{ items: Array<{ what: { action: string } }> }>(
      "audit.change.list",
      { accessToken: adminToken, entity: "AuditTestEntity" }
    );

    assert.ok(result.items.length >= 1);
    assert.equal(result.items[0]?.what.action, "audit.test.update");
  });

  it("rejects non-admin token", async (t) => {
    if (skipIfNoMongo(t)) return;

    await assert.rejects(
      () => callAction("audit.change.list", { accessToken: commercialToken }),
      (error: unknown) => getErrorCode(error) === "FORBIDDEN"
    );
  });

  it("rejects missing token", async (t) => {
    if (skipIfNoMongo(t)) return;

    await assert.rejects(
      () => callAction("audit.change.list", {}),
      (error: unknown) => getErrorCode(error) === "TOKEN_INVALID"
    );
  });
});

describe("audit.event.record", () => {
  it("records and lists critical events", async (t) => {
    if (skipIfNoMongo(t)) return;

    const recorded = await callAction<{ id: string; severity: string; type: string }>(
      "audit.event.record",
      {
        accessToken: adminToken,
        severity: "CRITICAL",
        type: "audit.test.incident",
        message: "Test critical incident",
        siteCode: "SITE-LYO"
      }
    );

    assert.ok(recorded.id);
    assert.equal(recorded.severity, "CRITICAL");

    const listed = await callAction<{ items: Array<{ type: string }> }>("audit.event.listCritical", {
      accessToken: adminToken,
      severity: "CRITICAL",
      siteCode: "SITE-LYO"
    });

    assert.ok(listed.items.some((item) => item.type === "audit.test.incident"));
  });
});

describe("audit.lot.trace", () => {
  it("returns timeline for seeded demo lot", async (t) => {
    if (skipIfNoMongo(t)) return;

    const result = await callAction<{
      lot: { lotId: string };
      timeline: unknown[];
      summary: { eventCount: number };
    }>("audit.lot.trace", {
      accessToken: adminToken,
      lotId: DEMO_LOT_ID
    });

    assert.equal(result.lot.lotId, DEMO_LOT_ID);
    assert.ok(result.timeline.length >= 4);
    assert.ok(result.summary.eventCount >= 4);
  });

  it("returns NOT_FOUND for unknown lot", async (t) => {
    if (skipIfNoMongo(t)) return;

    await assert.rejects(
      () =>
        callAction("audit.lot.trace", {
          accessToken: adminToken,
          lotId: "LOT-2026-99999"
        }),
      (error: unknown) => getErrorCode(error) === "NOT_FOUND"
    );
  });

  it("validates lotId format", async (t) => {
    if (skipIfNoMongo(t)) return;

    await assert.rejects(
      () =>
        callAction("audit.lot.trace", {
          accessToken: adminToken,
          lotId: "INVALID"
        }),
      (error: unknown) => getErrorCode(error) === "VALIDATION_ERROR"
    );
  });
});

describe("audit.lot.export", () => {
  it("exports CSV for demo lot", async (t) => {
    if (skipIfNoMongo(t)) return;

    const result = await callAction<{ format: string; filename: string; content: string }>(
      "audit.lot.export",
      {
        accessToken: adminToken,
        lotId: DEMO_LOT_ID
      }
    );

    assert.equal(result.format, "csv");
    assert.match(result.filename, /^LOT-2026-00001-trace\.csv$/);
    assert.match(result.content, /^timestamp,source,type,label,status,payload/);
  });
});
