import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { ServiceBroker } from "moleculer";
import moleculerConfig from "../moleculer.config.js";
import authService from "../services/auth.service.js";
import { prisma } from "../src/db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

config({ path: resolve(__dirname, "../../../.env") });

process.env.JWT_SECRET ??= "ci-test-jwt-secret";

const broker = new ServiceBroker({
  ...moleculerConfig,
  nodeID: "auth-test",
  logger: false,
  transporter: null
});

const adminEmail = "admin@aeronexis.local";
const adminPassword = process.env.SEED_ADMIN_PASSWORD;

let dbAvailable = false;

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

before(async () => {
  broker.createService(authService);
  await broker.start();

  if (!adminPassword) {
    dbAvailable = false;
    console.warn("Skipping auth integration tests: SEED_ADMIN_PASSWORD unavailable.");
    return;
  }

  try {
    await prisma.user.findFirst({ take: 1 });
    dbAvailable = true;
  } catch {
    dbAvailable = false;
    console.warn("Skipping auth integration tests: PostgreSQL unavailable.");
  }
});

after(async () => {
  await broker.stop();
});

describe("auth actions", () => {
  it("login succeeds for seeded admin", async (t) => {
    if (skipIfNoDb(t)) return;
    const result = await broker.call("auth.login", {
      email: adminEmail,
      password: adminPassword
    }) as {
      user: { email: string };
      accessToken: string;
      refreshToken: string;
      roles: Array<{ code: string }>;
    };

    assert.equal(result.user.email, adminEmail);
    assert.ok(result.accessToken);
    assert.ok(result.refreshToken);
    assert.ok(result.roles.some((role) => role.code === "admin"));
  });

  it("login rejects invalid password", async (t) => {
    if (skipIfNoDb(t)) return;
    await assert.rejects(
      () =>
        broker.call("auth.login", {
          email: adminEmail,
          password: "wrong-password"
        }),
      (error) => getErrorCode(error) === "INVALID_CREDENTIALS"
    );
  });

  it("login rejects invalid email format", async () => {
    await assert.rejects(
      () =>
        broker.call("auth.login", {
          email: "not-an-email",
          password: adminPassword
        }),
      (error) => getErrorCode(error) === "VALIDATION_ERROR"
    );
  });

  it("refresh rotates refresh token", async (t) => {
    if (skipIfNoDb(t)) return;
    const login = await broker.call("auth.login", {
      email: adminEmail,
      password: adminPassword
    }) as { refreshToken: string; accessToken: string };

    const refreshed = await broker.call("auth.refresh", {
      refreshToken: login.refreshToken
    }) as { refreshToken: string; accessToken: string };

    assert.notEqual(refreshed.refreshToken, login.refreshToken);
    assert.ok(refreshed.accessToken);

    await assert.rejects(
      () =>
        broker.call("auth.refresh", {
          refreshToken: login.refreshToken
        }),
      (error) => getErrorCode(error) === "TOKEN_INVALID"
    );
  });

  it("logout revokes refresh token", async (t) => {
    if (skipIfNoDb(t)) return;
    const login = await broker.call("auth.login", {
      email: adminEmail,
      password: adminPassword
    }) as { refreshToken: string };

    const result = await broker.call("auth.logout", {
      refreshToken: login.refreshToken
    }) as { success: boolean };

    assert.equal(result.success, true);

    await assert.rejects(
      () =>
        broker.call("auth.refresh", {
          refreshToken: login.refreshToken
        }),
      (error) => getErrorCode(error) === "TOKEN_INVALID"
    );
  });

  it("me returns current user", async (t) => {
    if (skipIfNoDb(t)) return;
    const login = await broker.call("auth.login", {
      email: adminEmail,
      password: adminPassword
    }) as { accessToken: string };

    const me = await broker.call("auth.me", {
      accessToken: login.accessToken
    }) as { user: { email: string }; roles: unknown[] };

    assert.equal(me.user.email, adminEmail);
    assert.ok(me.roles.length > 0);
  });

  it("user.create requires admin role", async () => {
    await assert.rejects(
      () =>
        broker.call("auth.user.create", {
          accessToken: "invalid-token",
          email: "new-user@aeronexis.local",
          password: "password123",
          firstName: "New",
          lastName: "User",
          roleCodes: ["operateur"]
        }),
      (error) => {
        const code = getErrorCode(error);
        return code === "TOKEN_INVALID" || code === "FORBIDDEN";
      }
    );
  });

  it("admin can list roles", async (t) => {
    if (skipIfNoDb(t)) return;
    const login = await broker.call("auth.login", {
      email: adminEmail,
      password: adminPassword
    }) as { accessToken: string };

    const result = await broker.call("auth.role.list", {
      accessToken: login.accessToken
    }) as { roles: Array<{ code: string }> };

    assert.ok(result.roles.length >= 5);
    assert.ok(result.roles.some((role) => role.code === "admin"));
  });

  it("admin can create and update a user", async (t) => {
    if (skipIfNoDb(t)) return;
    const login = await broker.call("auth.login", {
      email: adminEmail,
      password: adminPassword
    }) as { accessToken: string };

    const email = `test-user-${Date.now()}@aeronexis.local`;

    const created = await broker.call("auth.user.create", {
      accessToken: login.accessToken,
      email,
      password: "password123",
      firstName: "Test",
      lastName: "User",
      roleCodes: ["operateur"]
    }) as { user: { id: string; email: string }; roles: Array<{ code: string }> };

    assert.equal(created.user.email, email);
    assert.equal(created.roles[0].code, "operateur");

    const updated = await broker.call("auth.user.update", {
      accessToken: login.accessToken,
      id: created.user.id,
      firstName: "Updated",
      roleCodes: ["logistique"]
    }) as { user: { firstName: string }; roles: Array<{ code: string }> };

    assert.equal(updated.user.firstName, "Updated");
    assert.equal(updated.roles[0].code, "logistique");

    const listed = await broker.call("auth.user.list", {
      accessToken: login.accessToken,
      email
    }) as { users: Array<{ email: string }> };

    assert.equal(listed.users.length, 1);
    assert.equal(listed.users[0].email, email);
  });
});
