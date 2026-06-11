import type { ObjectId } from "mongodb";
import type { Db, Filter } from "mongodb";
import { COLLECTIONS } from "../db.js";
import type { UserActionLoggedPayload } from "@aeronexis/shared";

export interface AuditLogDocument {
  _id?: ObjectId;
  action: string;
  userId?: string;
  actorEmail?: string;
  roles?: string[];
  entity?: string;
  entityId?: string;
  diff?: { before?: unknown; after?: unknown };
  metadata?: Record<string, unknown>;
  correlationId?: string;
  siteCode?: string;
  severity?: string;
  timestamp: Date;
}

export interface ChangeListParams {
  entity?: string;
  entityId?: string;
  userId?: string;
  siteCode?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}

export interface ChangeListItem {
  id: string;
  who: { userId?: string; email?: string; roles?: string[] };
  when: string;
  what: {
    action: string;
    entity?: string;
    entityId?: string;
    diff?: { before?: unknown; after?: unknown };
    metadata?: Record<string, unknown>;
  };
  siteCode?: string;
  severity?: string;
  correlationId?: string;
}

export interface CriticalEventDocument {
  severity: "CRITICAL" | "WARNING";
  type: string;
  message: string;
  siteCode?: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
  correlationId?: string;
  timestamp: Date;
}

export interface CriticalEventRecordParams {
  severity: "CRITICAL" | "WARNING";
  type: string;
  message: string;
  siteCode?: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
  correlationId?: string;
}

export interface CriticalEventListParams {
  severity?: "CRITICAL" | "WARNING";
  siteCode?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}

function buildTimestampFilter(from?: Date, to?: Date) {
  if (!from && !to) {
    return {};
  }

  const timestamp: { $gte?: Date; $lte?: Date } = {};
  if (from) {
    timestamp.$gte = from;
  }
  if (to) {
    timestamp.$lte = to;
  }
  return { timestamp };
}

export function normalizeUserActionPayload(payload: UserActionLoggedPayload): AuditLogDocument {
  return {
    action: payload.action,
    userId: payload.actorId,
    actorEmail: payload.actorEmail,
    roles: payload.roles,
    entity: payload.entity,
    entityId: payload.entityId,
    diff: payload.diff,
    metadata: payload.metadata,
    correlationId: payload.correlationId,
    siteCode: payload.siteCode,
    severity: payload.severity ?? "INFO",
    timestamp: new Date(payload.timestamp)
  };
}

export async function insertAuditLog(db: Db, payload: UserActionLoggedPayload) {
  const document = normalizeUserActionPayload(payload);
  const result = await db.collection<AuditLogDocument>(COLLECTIONS.auditLogs).insertOne(document);
  return { id: result.insertedId.toString(), ...document };
}

export async function listAuditChanges(db: Db, params: ChangeListParams) {
  const filter: Filter<AuditLogDocument> = {
    ...(params.entity ? { entity: params.entity } : {}),
    ...(params.entityId ? { entityId: params.entityId } : {}),
    ...(params.userId ? { userId: params.userId } : {}),
    ...(params.siteCode ? { siteCode: params.siteCode } : {}),
    ...buildTimestampFilter(params.from, params.to)
  };

  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;
  const collection = db.collection<AuditLogDocument>(COLLECTIONS.auditLogs);

  const [docs, total] = await Promise.all([
    collection.find(filter).sort({ timestamp: -1 }).skip(offset).limit(limit).toArray(),
    collection.countDocuments(filter)
  ]);

  const items: ChangeListItem[] = docs.map((doc) => ({
    id: doc._id?.toString() ?? "",
    who: {
      userId: doc.userId,
      email: doc.actorEmail,
      roles: doc.roles
    },
    when: doc.timestamp.toISOString(),
    what: {
      action: doc.action,
      entity: doc.entity,
      entityId: doc.entityId,
      diff: doc.diff,
      metadata: doc.metadata
    },
    siteCode: doc.siteCode,
    severity: doc.severity,
    correlationId: doc.correlationId
  }));

  return { items, total, limit, offset };
}

export async function insertCriticalEvent(db: Db, params: CriticalEventRecordParams) {
  const document: CriticalEventDocument = {
    ...params,
    timestamp: new Date()
  };
  const result = await db
    .collection<CriticalEventDocument>(COLLECTIONS.criticalEvents)
    .insertOne(document);
  return { id: result.insertedId.toString(), ...document, timestamp: document.timestamp.toISOString() };
}

export async function listCriticalEvents(db: Db, params: CriticalEventListParams) {
  const filter: Filter<CriticalEventDocument> = {
    ...(params.severity ? { severity: params.severity } : {}),
    ...(params.siteCode ? { siteCode: params.siteCode } : {}),
    ...buildTimestampFilter(params.from, params.to)
  };

  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;
  const collection = db.collection<CriticalEventDocument>(COLLECTIONS.criticalEvents);

  const [docs, total] = await Promise.all([
    collection.find(filter).sort({ timestamp: -1 }).skip(offset).limit(limit).toArray(),
    collection.countDocuments(filter)
  ]);

  const items = docs.map((doc) => ({
    id: doc._id?.toString() ?? "",
    severity: doc.severity,
    type: doc.type,
    message: doc.message,
    siteCode: doc.siteCode,
    actorId: doc.actorId,
    metadata: doc.metadata,
    correlationId: doc.correlationId,
    timestamp: doc.timestamp.toISOString()
  }));

  return { items, total, limit, offset };
}

export const DEMO_LOT_ID = "BATCH-SEED-001";

export interface LotProgressDocument {
  lotId: string;
  ofId: string;
  siteCode: string;
  status: string;
  productCode?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventHistoryDocument {
  type: string;
  lotId?: string;
  ofId?: string;
  siteCode?: string;
  payload?: Record<string, unknown>;
  correlationId?: string;
  timestamp: Date;
}

export async function seedDemoLot(db: Db) {
  const lotCollection = db.collection<LotProgressDocument>(COLLECTIONS.lotProgressAudit);
  const eventCollection = db.collection<EventHistoryDocument>(COLLECTIONS.eventHistory);
  const now = new Date();
  const baseTime = new Date("2026-01-15T08:00:00.000Z");

  await lotCollection.updateOne(
    { lotId: DEMO_LOT_ID },
    {
      $set: {
        lotId: DEMO_LOT_ID,
        ofId: DEMO_LOT_ID,
        siteCode: "SITE-LYO",
        status: "IN_PROGRESS",
        productCode: "PROD-001",
        createdAt: baseTime,
        updatedAt: now
      }
    },
    { upsert: true }
  );

  const events: EventHistoryDocument[] = [
    {
      type: "production.batch.created",
      lotId: DEMO_LOT_ID,
      ofId: DEMO_LOT_ID,
      siteCode: "SITE-LYO",
      payload: { status: "PENDING", command_id: "CMD-2025-00001" },
      timestamp: baseTime
    },
    {
      type: "production.batch.progress",
      lotId: DEMO_LOT_ID,
      ofId: DEMO_LOT_ID,
      siteCode: "SITE-LYO",
      payload: { progress: 25, status: "IN_PROGRESS" },
      timestamp: new Date("2026-01-15T09:30:00.000Z")
    },
    {
      type: "stock.reserved",
      lotId: DEMO_LOT_ID,
      ofId: DEMO_LOT_ID,
      siteCode: "SITE-LYO",
      payload: { materialCode: "MAT-001", quantity: 1 },
      timestamp: new Date("2026-01-15T10:00:00.000Z")
    },
    {
      type: "shipment.planned",
      lotId: DEMO_LOT_ID,
      ofId: DEMO_LOT_ID,
      siteCode: "SITE-LYO",
      payload: { orderNumber: "CMD-2025-00001", shipmentCode: "SHP-2025-00001" },
      timestamp: new Date("2026-01-16T14:00:00.000Z")
    }
  ];

  for (const event of events) {
    await eventCollection.updateOne(
      { type: event.type, lotId: event.lotId, timestamp: event.timestamp },
      { $set: event },
      { upsert: true }
    );
  }
}
