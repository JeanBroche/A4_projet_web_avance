import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { ServiceBroker } from "moleculer";
import jwt, { type SignOptions } from "jsonwebtoken";
import { getErrorCode } from "@aeronexis/services-shared";
import { resetRedisClient } from "@aeronexis/redis-infra";
import moleculerConfig from "../moleculer.config.js";
import NotificationService from "../services/notification.service.js";
import { resetInboxStore } from "../src/lib/inbox.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });

process.env.JWT_SECRET ??= "ci-test-jwt-secret";
delete process.env.REDIS_URL;

const broker = new ServiceBroker({
  ...moleculerConfig,
  nodeID: "notification-test",
  logger: false,
  transporter: null
});

const tokens = {
  logistique: "",
  commercial: "",
  admin: ""
};

function signTestToken(roles: string[]) {
  return jwt.sign(
    {
      sub: "test-user",
      email: `${roles.join("-")}@aeronexis.test`,
      siteId: "SITE-LYO",
      roles
    },
    process.env.JWT_SECRET!,
    { expiresIn: "5m" } as SignOptions
  );
}

async function callAction<T>(action: string, params?: Record<string, unknown>): Promise<T> {
  return broker.call(action, params) as Promise<T>;
}

before(async () => {
  resetRedisClient();
  resetInboxStore();
  broker.createService(NotificationService);
  await broker.start();
  tokens.logistique = signTestToken(["logistique"]);
  tokens.commercial = signTestToken(["commercial"]);
  tokens.admin = signTestToken(["admin"]);
});

after(async () => {
  await broker.stop();
  resetRedisClient();
  resetInboxStore();
});

describe("notification.ping", () => {
  it("returns pong", async () => {
    assert.equal(await callAction<string>("notification.ping"), "pong");
  });
});

describe("event handlers", () => {
  it("creates notification on stock.material.low", async () => {
    await broker.emit("stock.material.low", {
      alertId: "a1",
      materialId: "mat-1",
      materialCode: "MAT-001",
      siteCode: "SITE-LYO",
      severity: "CRITICAL",
      available: 0,
      minimum: 10,
      message: "Rupture MAT-001"
    });

    const inbox = await callAction<{ total: number; items: Array<{ type: string }> }>(
      "notification.inbox.list",
      { accessToken: tokens.logistique, siteCode: "SITE-LYO" }
    );
    assert.ok(inbox.total >= 1);
    assert.equal(inbox.items[0]?.type, "stock.material.low");
  });

  it("creates notification on stock.supplier.delay.reported", async () => {
    await broker.emit("stock.supplier.delay.reported", {
      delayId: "d1",
      materialId: "mat-2",
      materialCode: "MAT-002",
      siteCode: "SITE-LYO",
      supplier: "ACME"
    });

    const inbox = await callAction<{ items: Array<{ type: string }> }>(
      "notification.inbox.list",
      { accessToken: tokens.logistique, siteCode: "SITE-LYO" }
    );
    assert.ok(inbox.items.some((item) => item.type === "stock.supplier.delay"));
  });

  it("creates notification on shipment.delivery.alert", async () => {
    await broker.emit("shipment.delivery.alert", {
      id: "shp-1",
      code: "SHP-001",
      orderNumber: "CMD-001",
      siteCode: "SITE-LYO",
      status: "IN_TRANSIT",
      daysLate: 2
    });

    const inbox = await callAction<{ items: Array<{ type: string }> }>(
      "notification.inbox.list",
      { accessToken: tokens.logistique, siteCode: "SITE-LYO" }
    );
    assert.ok(inbox.items.some((item) => item.type === "shipment.delivery.alert"));
  });

  it("deduplicates identical stock alerts within TTL window", async () => {
    const payload = {
      alertId: "a-dedup",
      materialId: "mat-dedup",
      materialCode: "MAT-DEDUP",
      siteCode: "SITE-LYO",
      severity: "WARNING",
      available: 2,
      minimum: 10
    };
    await broker.emit("stock.material.low", payload);
    await broker.emit("stock.material.low", payload);

    const inbox = await callAction<{ items: Array<{ payload?: { materialId?: string } }> }>(
      "notification.inbox.list",
      { accessToken: tokens.logistique, siteCode: "SITE-LYO", limit: 100 }
    );
    const matches = inbox.items.filter(
      (item) => item.payload?.materialId === "mat-dedup"
    );
    assert.equal(matches.length, 1);
  });
});

describe("notification.inbox", () => {
  it("rejects commercial role", async () => {
    try {
      await callAction("notification.inbox.list", {
        accessToken: tokens.commercial,
        siteCode: "SITE-LYO"
      });
      assert.fail("expected FORBIDDEN");
    } catch (error) {
      assert.equal(getErrorCode(error), "FORBIDDEN");
    }
  });

  it("marks a notification as read", async () => {
    await broker.emit("stock.material.low", {
      alertId: "a-read",
      materialId: "mat-read",
      materialCode: "MAT-READ",
      siteCode: "SITE-LYO",
      severity: "CRITICAL",
      available: 0,
      minimum: 5
    });

    const before = await callAction<{
      items: Array<{ id: string; read: boolean }>;
      unreadCount: number;
    }>("notification.inbox.list", {
      accessToken: tokens.logistique,
      siteCode: "SITE-LYO"
    });
    const target = before.items.find((item) => item.id);
    assert.ok(target);
    assert.equal(target.read, false);

    await callAction("notification.inbox.markRead", {
      accessToken: tokens.logistique,
      siteCode: "SITE-LYO",
      notificationId: target.id
    });

    const after = await callAction<{ items: Array<{ id: string; read: boolean }> }>(
      "notification.inbox.list",
      { accessToken: tokens.logistique, siteCode: "SITE-LYO" }
    );
    const updated = after.items.find((item) => item.id === target.id);
    assert.equal(updated?.read, true);
  });

  it("returns unread count", async () => {
    const result = await callAction<{ unreadCount: number }>(
      "notification.inbox.unreadCount",
      { accessToken: tokens.admin, siteCode: "SITE-LYO" }
    );
    assert.ok(typeof result.unreadCount === "number");
  });
});
