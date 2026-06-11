import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import assert from "node:assert/strict";
import { after, afterEach, before, describe, it } from "node:test";
import { ServiceBroker } from "moleculer";
import jwt, { type SignOptions } from "jsonwebtoken";
import {
  deleteDocumentObject,
  getStorageConfig,
  getMinioClient,
  MAX_DOCUMENT_SIZE_BYTES,
  resetMinioClient
} from "@aeronexis/storage";
import moleculerConfig from "../moleculer.config.js";
import auditService from "../services/audit.service.js";
import { connectMongo, disconnectMongo, getDb } from "../src/db.js";
import { COLLECTIONS } from "../src/db.js";
import { DEMO_LOT_ID, seedDemoLot } from "../src/lib/audit-helpers.js";
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
let minioAvailable = false;
let adminToken = "";
let commercialToken = "";
let logistiqueToken = "";
let commercialOtherSiteToken = "";
const createdSiteDocumentIds: string[] = [];

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

function skipIfNoMongoOrMinio(t: { skip: (reason?: string) => void }) {
  if (!mongoAvailable || !minioAvailable) {
    t.skip("MongoDB or MinIO unavailable");
    return true;
  }
  return false;
}

function samplePdfBuffer(content = "site-document-test") {
  return Buffer.from(`%PDF-1.4 ${content}`);
}

async function isMinioAvailable() {
  try {
    resetMinioClient();
    const client = getMinioClient();
    const { bucket } = getStorageConfig();
    return await client.bucketExists(bucket);
  } catch {
    return false;
  }
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

  const db = getDb();
  await seedDemoLot(db);
  await db.collection(COLLECTIONS.auditLogs).deleteMany({ entity: "AuditTestEntity" });

  broker.createService(auditService);
  await broker.start();

  adminToken = signTestToken(["admin"], { sub: "admin-user", email: "admin@aeronexis.test" });
  commercialToken = signTestToken(["commercial"], {
    sub: "commercial-user",
    email: "commercial@aeronexis.test"
  });
  logistiqueToken = signTestToken(["logistique"], {
    sub: "logistique-user",
    email: "logistique@aeronexis.test"
  });
  commercialOtherSiteToken = signTestToken(["commercial"], {
    sub: "commercial-par-user",
    email: "commercial-par@aeronexis.test",
    siteId: "SITE-PAR"
  });

  minioAvailable = await isMinioAvailable();
});

afterEach(async () => {
  if (!mongoAvailable || createdSiteDocumentIds.length === 0) {
    return;
  }

  const db = getDb();
  while (createdSiteDocumentIds.length > 0) {
    const documentId = createdSiteDocumentIds.pop();
    if (!documentId) continue;

    const record = await db.collection(COLLECTIONS.documentAttachments).findOne({ id: documentId });
    if (record && typeof record.objectKey === "string") {
      await deleteDocumentObject(record.objectKey).catch(() => undefined);
    }
    await db.collection(COLLECTIONS.documentAttachments).deleteOne({ id: documentId }).catch(() => undefined);
  }
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

describe("audit lot trace events", () => {
  it("records production.batch.created in event_history", async (t) => {
    if (skipIfNoMongo(t)) return;

    await broker.emit("production.batch.created", {
      batch_code: "BATCH-EVENT-TEST",
      command_id: "CMD-EVENT-001",
      siteCode: "SITE-LYO",
      status: "PENDING"
    });

    const db = getDb();
    const match = await db.collection(COLLECTIONS.eventHistory).findOne({
      type: "production.batch.created",
      orderNumber: "CMD-EVENT-001"
    });

    assert.ok(match);
    assert.equal(match.siteCode, "SITE-LYO");
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
    assert.match(result.filename, /^BATCH-SEED-001-trace\.csv$/);
    assert.match(result.content, /^timestamp,source,type,label,status,payload/);
  });
});

describe("audit.siteDocument.upload", () => {
  it("uploads a PDF as admin", async (t) => {
    if (skipIfNoMongoOrMinio(t)) return;

    const file = samplePdfBuffer();
    const result = await callAction<{
      id: string;
      siteCode: string;
      filename: string;
      contentType: string;
      sizeBytes: number;
      category: string | null;
    }>("audit.siteDocument.upload", {
      accessToken: adminToken,
      siteCode: "SITE-LYO",
      filename: "certificat-test.pdf",
      contentType: "application/pdf",
      contentBase64: file.toString("base64"),
      category: "certificat"
    });

    createdSiteDocumentIds.push(result.id);
    assert.equal(result.filename, "certificat-test.pdf");
    assert.equal(result.contentType, "application/pdf");
    assert.equal(result.sizeBytes, file.length);
    assert.equal(result.siteCode, "SITE-LYO");
    assert.equal(result.category, "certificat");
  });

  it("rejects upload without access token", async (t) => {
    if (skipIfNoMongoOrMinio(t)) return;

    await assert.rejects(
      () =>
        callAction("audit.siteDocument.upload", {
          siteCode: "SITE-LYO",
          filename: "certificat-test.pdf",
          contentType: "application/pdf",
          contentBase64: samplePdfBuffer().toString("base64")
        }),
      (error: unknown) => getErrorCode(error) === "TOKEN_INVALID"
    );
  });

  it("rejects upload for non-admin role", async (t) => {
    if (skipIfNoMongoOrMinio(t)) return;

    await assert.rejects(
      () =>
        callAction("audit.siteDocument.upload", {
          accessToken: logistiqueToken,
          siteCode: "SITE-LYO",
          filename: "certificat-test.pdf",
          contentType: "application/pdf",
          contentBase64: samplePdfBuffer().toString("base64")
        }),
      (error: unknown) => getErrorCode(error) === "FORBIDDEN"
    );
  });

  it("rejects disallowed MIME type", async (t) => {
    if (skipIfNoMongoOrMinio(t)) return;

    await assert.rejects(
      () =>
        callAction("audit.siteDocument.upload", {
          accessToken: adminToken,
          siteCode: "SITE-LYO",
          filename: "script.exe",
          contentType: "application/x-msdownload",
          contentBase64: Buffer.from("MZ").toString("base64")
        }),
      (error: unknown) => getErrorCode(error) === "VALIDATION_ERROR"
    );
  });

  it("rejects empty file", async (t) => {
    if (skipIfNoMongoOrMinio(t)) return;

    await assert.rejects(
      () =>
        callAction("audit.siteDocument.upload", {
          accessToken: adminToken,
          siteCode: "SITE-LYO",
          filename: "empty.pdf",
          contentType: "application/pdf",
          contentBase64: ""
        }),
      (error: unknown) => getErrorCode(error) === "VALIDATION_ERROR"
    );
  });

  it("rejects file exceeding max size", async (t) => {
    if (skipIfNoMongoOrMinio(t)) return;

    const oversized = Buffer.alloc(MAX_DOCUMENT_SIZE_BYTES + 1, 1);
    await assert.rejects(
      () =>
        callAction("audit.siteDocument.upload", {
          accessToken: adminToken,
          siteCode: "SITE-LYO",
          filename: "large.pdf",
          contentType: "application/pdf",
          contentBase64: oversized.toString("base64")
        }),
      (error: unknown) => getErrorCode(error) === "VALIDATION_ERROR"
    );
  });
});

describe("audit.siteDocument.get", () => {
  it("returns document content for admin on same site", async (t) => {
    if (skipIfNoMongoOrMinio(t)) return;

    const file = samplePdfBuffer("get-test");
    const uploaded = await callAction<{ id: string }>("audit.siteDocument.upload", {
      accessToken: adminToken,
      siteCode: "SITE-LYO",
      filename: "certificat-get.pdf",
      contentType: "application/pdf",
      contentBase64: file.toString("base64"),
      category: "pj"
    });
    createdSiteDocumentIds.push(uploaded.id);

    const result = await callAction<{
      id: string;
      siteCode: string;
      content: string;
      contentType: string;
    }>("audit.siteDocument.get", {
      accessToken: adminToken,
      id: uploaded.id
    });

    assert.equal(result.id, uploaded.id);
    assert.equal(result.siteCode, "SITE-LYO");
    assert.equal(result.contentType, "application/pdf");
    assert.equal(Buffer.from(result.content, "base64").toString(), file.toString());
  });

  it("rejects access from user on different site", async (t) => {
    if (skipIfNoMongoOrMinio(t)) return;

    const uploaded = await callAction<{ id: string }>("audit.siteDocument.upload", {
      accessToken: adminToken,
      siteCode: "SITE-LYO",
      filename: "certificat-forbidden.pdf",
      contentType: "application/pdf",
      contentBase64: samplePdfBuffer().toString("base64")
    });
    createdSiteDocumentIds.push(uploaded.id);

    await assert.rejects(
      () =>
        callAction("audit.siteDocument.get", {
          accessToken: commercialOtherSiteToken,
          id: uploaded.id
        }),
      (error: unknown) => getErrorCode(error) === "FORBIDDEN"
    );
  });

  it("returns NOT_FOUND for unknown document", async (t) => {
    if (skipIfNoMongoOrMinio(t)) return;

    await assert.rejects(
      () =>
        callAction("audit.siteDocument.get", {
          accessToken: adminToken,
          id: "00000000-0000-4000-8000-000000000000"
        }),
      (error: unknown) => getErrorCode(error) === "NOT_FOUND"
    );
  });
});
