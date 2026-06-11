import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  MongoClient,
  type Db,
  type CreateIndexesOptions,
  type IndexSpecification
} from "mongodb";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../.env") });

type CollectionSpec = {
  name: string;
  indexes: Array<{ key: IndexSpecification; options?: CreateIndexesOptions }>;
};

const COLLECTIONS: CollectionSpec[] = [
  {
    name: "audit_logs",
    indexes: [
      { key: { userId: 1, timestamp: -1 }, options: { name: "userId_1_timestamp_-1" } },
      { key: { entity: 1, entityId: 1 }, options: { name: "entity_1_entityId_1" } },
      { key: { siteCode: 1, timestamp: -1 }, options: { name: "siteCode_1_timestamp_-1" } }
    ]
  },
  {
    name: "event_history",
    indexes: [
      { key: { lotId: 1, timestamp: -1 }, options: { name: "lotId_1_timestamp_-1" } },
      { key: { ofId: 1, timestamp: -1 }, options: { name: "ofId_1_timestamp_-1" } },
      { key: { correlationId: 1 }, options: { name: "correlationId_1" } },
      { key: { timestamp: -1 }, options: { name: "timestamp_-1" } }
    ]
  },
  {
    name: "critical_events",
    indexes: [
      { key: { severity: 1, timestamp: -1 }, options: { name: "severity_1_timestamp_-1" } },
      { key: { siteCode: 1, timestamp: -1 }, options: { name: "siteCode_1_timestamp_-1" } }
    ]
  },
  {
    name: "lot_progress_audit",
    indexes: [
      { key: { lotId: 1 }, options: { name: "lotId_1", unique: true } },
      { key: { ofId: 1 }, options: { name: "ofId_1" } }
    ]
  },
  {
    name: "document_attachments",
    indexes: [
      { key: { lotId: 1, uploadedAt: -1 }, options: { name: "lotId_1_uploadedAt_-1" } },
      {
        key: { siteCode: 1, category: 1, uploadedAt: -1 },
        options: { name: "siteCode_1_category_1_uploadedAt_-1" }
      },
      { key: { id: 1 }, options: { name: "id_1", unique: true } }
    ]
  }
];

async function ensureCollection(db: Db, name: string): Promise<void> {
  const existing = await db.listCollections({ name }, { nameOnly: true }).toArray();
  if (existing.length > 0) {
    console.log(`[mongo-init] collection "${name}" deja presente`);
    return;
  }
  await db.createCollection(name);
  console.log(`[mongo-init] collection "${name}" creee`);
}

async function ensureIndexes(db: Db, spec: CollectionSpec): Promise<void> {
  const coll = db.collection(spec.name);
  for (const index of spec.indexes) {
    const indexName = await coll.createIndex(index.key, index.options);
    console.log(`[mongo-init] index "${indexName}" sur "${spec.name}" pret`);
  }
}

async function main(): Promise<void> {
  const uri = process.env.MONGO_URI ?? "mongodb://localhost:27017/aeronexis";
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 10_000
  });

  console.log(`[mongo-init] connexion ${uri}`);
  await client.connect();

  try {
    const db = client.db();
    console.log(`[mongo-init] base ciblee : ${db.databaseName}`);

    for (const spec of COLLECTIONS) {
      await ensureCollection(db, spec.name);
      await ensureIndexes(db, spec);
    }

    console.log("[mongo-init] termine avec succes");
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("[mongo-init] echec :", err);
  process.exit(1);
});
