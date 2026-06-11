import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { MongoClient, type Db } from "mongodb";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });

export const COLLECTIONS = {
  auditLogs: "audit_logs",
  eventHistory: "event_history",
  criticalEvents: "critical_events",
  lotProgressAudit: "lot_progress_audit",
  documentAttachments: "document_attachments"
} as const;

let client: MongoClient | null = null;
let db: Db | null = null;

function getMongoUri() {
  return process.env.MONGO_URI || "mongodb://localhost:27017/aeronexis";
}

export async function connectMongo(): Promise<Db> {
  if (db) {
    return db;
  }

  client = new MongoClient(getMongoUri(), {
    serverSelectionTimeoutMS: 2_000
  });
  await client.connect();
  db = client.db();
  return db;
}

export async function ensureIndexes(database: Db) {
  await Promise.all([
    database
      .collection(COLLECTIONS.auditLogs)
      .createIndexes([
        { key: { entity: 1, entityId: 1, timestamp: -1 } },
        { key: { userId: 1, timestamp: -1 } },
        { key: { siteCode: 1, timestamp: -1 } }
      ]),
    database
      .collection(COLLECTIONS.eventHistory)
      .createIndexes([
        { key: { lotId: 1, timestamp: -1 } },
        { key: { ofId: 1, timestamp: -1 } },
        { key: { correlationId: 1 } }
      ]),
    database
      .collection(COLLECTIONS.criticalEvents)
      .createIndexes([
        { key: { severity: 1, timestamp: -1 } },
        { key: { siteCode: 1, timestamp: -1 } }
      ]),
    database
      .collection(COLLECTIONS.lotProgressAudit)
      .createIndexes([
        { key: { lotId: 1 }, unique: true },
        { key: { ofId: 1 } }
      ]),
    database
      .collection(COLLECTIONS.documentAttachments)
      .createIndexes([
        { key: { lotId: 1, uploadedAt: -1 } },
        { key: { siteCode: 1, category: 1, uploadedAt: -1 } },
        { key: { id: 1 }, unique: true }
      ])
  ]);
}

export async function disconnectMongo() {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}

export function getDb(): Db {
  if (!db) {
    throw new Error("MongoDB is not connected. Call connectMongo() first.");
  }
  return db;
}
