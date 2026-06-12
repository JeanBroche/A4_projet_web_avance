import type { ObjectId } from "mongodb";
import type { Db, Filter } from "mongodb";
import { COLLECTIONS } from "../db.js";
import type { UserActionLoggedPayload } from "@aeronexis/shared";
import {
  SEED_ANOMALY_RESOLVED,
  SEED_AUDIT_DOCUMENTS,
  SEED_BATCHES,
  SEED_MATERIALS,
  SEED_ORDERS,
  SEED_PURCHASE_ORDERS,
  SEED_SHIPMENTS,
  SEED_SITES,
  SEED_USER_IDS,
  SEED_USERS
} from "@aeronexis/shared";
import type { DocumentAttachmentRecord } from "./document-store.js";

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

export const DEMO_LOT_ID = SEED_BATCHES.LYO_IN_PROGRESS;

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

export async function seedDemoScenario(db: Db) {
  const lotCollection = db.collection<LotProgressDocument>(COLLECTIONS.lotProgressAudit);
  const eventCollection = db.collection<EventHistoryDocument>(COLLECTIONS.eventHistory);
  const auditCollection = db.collection<AuditLogDocument>(COLLECTIONS.auditLogs);
  const criticalCollection = db.collection<CriticalEventDocument>(COLLECTIONS.criticalEvents);
  const documentCollection = db.collection<DocumentAttachmentRecord>(COLLECTIONS.documentAttachments);
  const now = new Date();
  const baseTime = new Date("2026-01-15T08:00:00.000Z");

  const lotProgressEntries: LotProgressDocument[] = [
    {
      lotId: SEED_BATCHES.LYO_IN_PROGRESS,
      ofId: SEED_BATCHES.LYO_IN_PROGRESS,
      siteCode: SEED_SITES.LYO,
      status: "IN_PROGRESS",
      productCode: "PROD-001",
      createdAt: baseTime,
      updatedAt: now
    },
    {
      lotId: SEED_BATCHES.LYO_COMPLETED,
      ofId: SEED_BATCHES.LYO_COMPLETED,
      siteCode: SEED_SITES.LYO,
      status: "COMPLETED",
      productCode: "PROD-001",
      createdAt: new Date("2026-01-05T08:00:00.000Z"),
      updatedAt: now
    },
    {
      lotId: SEED_BATCHES.LYO_PLAQUE_PENDING,
      ofId: SEED_BATCHES.LYO_PLAQUE_PENDING,
      siteCode: SEED_SITES.LYO,
      status: "PENDING",
      productCode: "PROD-002",
      createdAt: new Date("2026-01-12T08:00:00.000Z"),
      updatedAt: now
    },
    {
      lotId: SEED_BATCHES.VERIN_IN_PROGRESS,
      ofId: SEED_BATCHES.VERIN_IN_PROGRESS,
      siteCode: SEED_SITES.LYO,
      status: "IN_PROGRESS",
      productCode: "PROD-003",
      createdAt: new Date("2026-01-10T08:00:00.000Z"),
      updatedAt: now
    },
    {
      lotId: SEED_BATCHES.BRAS_COMPLETED,
      ofId: SEED_BATCHES.BRAS_COMPLETED,
      siteCode: SEED_SITES.LYO,
      status: "COMPLETED",
      productCode: "PROD-004",
      createdAt: new Date("2025-11-01T08:00:00.000Z"),
      updatedAt: now
    },
    {
      lotId: SEED_BATCHES.PAR_PENDING,
      ofId: SEED_BATCHES.PAR_PENDING,
      siteCode: SEED_SITES.PAR,
      status: "PENDING",
      productCode: "PROD-PAR-001",
      createdAt: new Date("2026-01-18T08:00:00.000Z"),
      updatedAt: now
    }
  ];

  for (const entry of lotProgressEntries) {
    await lotCollection.updateOne({ lotId: entry.lotId }, { $set: entry }, { upsert: true });
  }

  const events: EventHistoryDocument[] = [
    {
      type: "production.batch.created",
      lotId: DEMO_LOT_ID,
      ofId: DEMO_LOT_ID,
      siteCode: SEED_SITES.LYO,
      payload: { status: "PENDING", command_id: SEED_ORDERS.CMD04 },
      timestamp: baseTime
    },
    {
      type: "production.batch.progress",
      lotId: DEMO_LOT_ID,
      ofId: DEMO_LOT_ID,
      siteCode: SEED_SITES.LYO,
      payload: { progress: 25, status: "IN_PROGRESS" },
      timestamp: new Date("2026-01-15T09:30:00.000Z")
    },
    {
      type: "production.batch.anomaly_reported",
      lotId: DEMO_LOT_ID,
      ofId: DEMO_LOT_ID,
      siteCode: SEED_SITES.LYO,
      payload: { anomalyCode: "ANOMALY-SEED-001", status: "OPEN" },
      timestamp: new Date("2026-01-15T11:00:00.000Z")
    },
    {
      type: "stock.reserved",
      lotId: DEMO_LOT_ID,
      ofId: DEMO_LOT_ID,
      siteCode: SEED_SITES.LYO,
      payload: { materialCode: SEED_MATERIALS.ACIER, quantity: 1 },
      timestamp: new Date("2026-01-15T10:00:00.000Z")
    },
    {
      type: "shipment.planned",
      lotId: DEMO_LOT_ID,
      ofId: DEMO_LOT_ID,
      siteCode: SEED_SITES.LYO,
      payload: { orderNumber: SEED_ORDERS.CMD01, shipmentCode: SEED_SHIPMENTS.PLANNED },
      timestamp: new Date("2026-01-16T14:00:00.000Z")
    },
    {
      type: "shipment.delivered",
      lotId: SEED_BATCHES.LYO_COMPLETED,
      ofId: SEED_BATCHES.LYO_COMPLETED,
      siteCode: SEED_SITES.LYO,
      payload: { orderNumber: SEED_ORDERS.CMD05, shipmentCode: SEED_SHIPMENTS.DELIVERED },
      timestamp: new Date("2026-01-20T16:00:00.000Z")
    },
    {
      type: "production.batch.created",
      lotId: SEED_BATCHES.LYO_PLAQUE_PENDING,
      ofId: SEED_BATCHES.LYO_PLAQUE_PENDING,
      siteCode: SEED_SITES.LYO,
      payload: { status: "PENDING", command_id: SEED_ORDERS.CMD03 },
      timestamp: new Date("2026-01-12T08:00:00.000Z")
    },
    {
      type: "production.batch.created",
      lotId: SEED_BATCHES.VERIN_IN_PROGRESS,
      ofId: SEED_BATCHES.VERIN_IN_PROGRESS,
      siteCode: SEED_SITES.LYO,
      payload: { status: "IN_PROGRESS", command_id: SEED_ORDERS.CMD02 },
      timestamp: new Date("2026-01-10T08:00:00.000Z")
    },
    {
      type: "stock.purchase_order.created",
      lotId: SEED_PURCHASE_ORDERS[0].poNumber,
      siteCode: SEED_SITES.LYO,
      payload: { poNumber: SEED_PURCHASE_ORDERS[0].poNumber, materialCode: SEED_MATERIALS.TITANE },
      timestamp: new Date("2026-01-13T10:00:00.000Z")
    },
    {
      type: "shipment.picklist.created",
      lotId: SEED_BATCHES.LYO_PLAQUE_PENDING,
      ofId: SEED_BATCHES.LYO_PLAQUE_PENDING,
      siteCode: SEED_SITES.LYO,
      payload: { pickListCode: "PICK-2025-00004", orderNumber: SEED_ORDERS.CMD03, status: "PENDING" },
      timestamp: new Date("2026-01-17T09:00:00.000Z")
    },
    {
      type: "shipment.planned",
      lotId: SEED_BATCHES.PAR_PENDING,
      ofId: SEED_BATCHES.PAR_PENDING,
      siteCode: SEED_SITES.PAR,
      payload: { orderNumber: SEED_ORDERS.CMD_PAR, shipmentCode: SEED_SHIPMENTS.PAR_PLANNED },
      timestamp: new Date("2026-01-19T14:00:00.000Z")
    },
    {
      type: "production.anomaly.resolved",
      lotId: SEED_BATCHES.LYO_COMPLETED,
      ofId: SEED_BATCHES.LYO_COMPLETED,
      siteCode: SEED_SITES.LYO,
      payload: { anomalyCode: SEED_ANOMALY_RESOLVED.CODE, status: "CLOSED" },
      timestamp: new Date("2026-01-09T15:00:00.000Z")
    }
  ];

  for (const event of events) {
    await eventCollection.updateOne(
      { type: event.type, lotId: event.lotId, timestamp: event.timestamp },
      { $set: event },
      { upsert: true }
    );
  }

  const auditLogs: AuditLogDocument[] = [
    {
      action: "auth.login",
      userId: SEED_USER_IDS.operateur,
      actorEmail: SEED_USERS.operateur.email,
      roles: ["operateur"],
      siteCode: SEED_SITES.LYO,
      severity: "INFO",
      timestamp: new Date("2026-01-15T07:55:00.000Z")
    },
    {
      action: "order.validate",
      userId: SEED_USER_IDS.commercial,
      actorEmail: SEED_USERS.commercial.email,
      roles: ["commercial"],
      entity: "order",
      entityId: SEED_ORDERS.CMD03,
      siteCode: SEED_SITES.LYO,
      severity: "INFO",
      timestamp: new Date("2026-01-14T10:00:00.000Z")
    },
    {
      action: "order.validate",
      userId: SEED_USER_IDS.commercial,
      actorEmail: SEED_USERS.commercial.email,
      roles: ["commercial"],
      entity: "order",
      entityId: SEED_ORDERS.CMD04,
      siteCode: SEED_SITES.LYO,
      severity: "INFO",
      timestamp: new Date("2026-01-12T09:00:00.000Z")
    },
    {
      action: "stock.reserve",
      userId: SEED_USER_IDS.logistique,
      actorEmail: SEED_USERS.logistique.email,
      roles: ["logistique"],
      entity: "batch",
      entityId: DEMO_LOT_ID,
      siteCode: SEED_SITES.LYO,
      severity: "INFO",
      metadata: { materialCode: SEED_MATERIALS.ACIER, quantity: 1 },
      timestamp: new Date("2026-01-15T10:00:00.000Z")
    },
    {
      action: "production.anomaly.report",
      userId: SEED_USER_IDS.operateur,
      actorEmail: SEED_USERS.operateur.email,
      roles: ["operateur"],
      entity: "batch",
      entityId: DEMO_LOT_ID,
      siteCode: SEED_SITES.LYO,
      severity: "WARNING",
      metadata: { anomalyCode: "ANOMALY-SEED-001" },
      timestamp: new Date("2026-01-15T11:00:00.000Z")
    },
    {
      action: "shipment.plan",
      userId: SEED_USER_IDS.logistique,
      actorEmail: SEED_USERS.logistique.email,
      roles: ["logistique"],
      entity: "shipment",
      entityId: SEED_SHIPMENTS.PLANNED,
      siteCode: SEED_SITES.LYO,
      severity: "INFO",
      timestamp: new Date("2026-01-16T14:00:00.000Z")
    },
    {
      action: "shipment.dispatch",
      userId: SEED_USER_IDS.logistique,
      actorEmail: SEED_USERS.logistique.email,
      roles: ["logistique"],
      entity: "shipment",
      entityId: SEED_SHIPMENTS.IN_TRANSIT,
      siteCode: SEED_SITES.LYO,
      severity: "INFO",
      timestamp: new Date("2026-01-18T08:00:00.000Z")
    },
    {
      action: "shipment.deliver",
      userId: SEED_USER_IDS.logistique,
      actorEmail: SEED_USERS.logistique.email,
      roles: ["logistique"],
      entity: "shipment",
      entityId: SEED_SHIPMENTS.DELIVERED,
      siteCode: SEED_SITES.LYO,
      severity: "INFO",
      timestamp: new Date("2026-01-20T16:00:00.000Z")
    },
    {
      action: "auth.login",
      userId: SEED_USER_IDS.direction,
      actorEmail: SEED_USERS.direction.email,
      roles: ["direction"],
      siteCode: SEED_SITES.LYO,
      severity: "INFO",
      timestamp: new Date("2026-01-21T08:00:00.000Z")
    },
    {
      action: "order.create",
      userId: SEED_USER_IDS.commercial,
      actorEmail: SEED_USERS.commercial.email,
      roles: ["commercial"],
      entity: "order",
      entityId: SEED_ORDERS.CMD02,
      siteCode: SEED_SITES.LYO,
      severity: "INFO",
      metadata: { isUrgent: true },
      timestamp: new Date("2026-01-21T09:00:00.000Z")
    },
    {
      action: "stock.purchase_order.create",
      userId: SEED_USER_IDS.logistique,
      actorEmail: SEED_USERS.logistique.email,
      roles: ["logistique"],
      entity: "purchase_order",
      entityId: SEED_PURCHASE_ORDERS[0].poNumber,
      siteCode: SEED_SITES.LYO,
      severity: "INFO",
      timestamp: new Date("2026-01-13T10:00:00.000Z")
    },
    {
      action: "shipment.picklist.create",
      userId: SEED_USER_IDS.logistique,
      actorEmail: SEED_USERS.logistique.email,
      roles: ["logistique"],
      entity: "pick_list",
      entityId: "PICK-2025-00004",
      siteCode: SEED_SITES.LYO,
      severity: "INFO",
      timestamp: new Date("2026-01-17T09:00:00.000Z")
    },
    {
      action: "production.anomaly.resolve",
      userId: SEED_USER_IDS.operateur,
      actorEmail: SEED_USERS.operateur.email,
      roles: ["operateur"],
      entity: "batch",
      entityId: SEED_BATCHES.LYO_COMPLETED,
      siteCode: SEED_SITES.LYO,
      severity: "INFO",
      metadata: { anomalyCode: SEED_ANOMALY_RESOLVED.CODE },
      timestamp: new Date("2026-01-09T15:00:00.000Z")
    },
    {
      action: "shipment.plan",
      userId: SEED_USER_IDS.logistique,
      actorEmail: SEED_USERS.logistique.email,
      roles: ["logistique"],
      entity: "shipment",
      entityId: SEED_SHIPMENTS.PAR_PLANNED,
      siteCode: SEED_SITES.PAR,
      severity: "INFO",
      timestamp: new Date("2026-01-19T14:00:00.000Z")
    },
    {
      action: "auth.login",
      userId: SEED_USER_IDS.commercial,
      actorEmail: SEED_USERS.commercial.email,
      roles: ["commercial"],
      siteCode: SEED_SITES.PAR,
      severity: "INFO",
      timestamp: new Date("2026-01-21T08:30:00.000Z")
    }
  ];

  for (const log of auditLogs) {
    await auditCollection.updateOne(
      {
        action: log.action,
        userId: log.userId,
        ...(log.entityId ? { entityId: log.entityId } : {}),
        timestamp: log.timestamp
      },
      { $set: log },
      { upsert: true }
    );
  }

  const criticalEvents: CriticalEventDocument[] = [
    {
      severity: "CRITICAL",
      type: "stock.material.low",
      message: "Rupture titane grade 5 — stock sous seuil minimum",
      siteCode: SEED_SITES.LYO,
      actorId: SEED_USER_IDS.logistique,
      metadata: { materialCode: SEED_MATERIALS.TITANE },
      timestamp: new Date("2026-01-14T12:00:00.000Z")
    },
    {
      severity: "WARNING",
      type: "production.batch.delay",
      message: "Lot BATCH-SEED-001 en retard sur planning",
      siteCode: SEED_SITES.LYO,
      actorId: SEED_USER_IDS.operateur,
      metadata: { lotId: DEMO_LOT_ID },
      timestamp: new Date("2026-01-16T09:00:00.000Z")
    },
    {
      severity: "WARNING",
      type: "stock.supplier.delay",
      message: "Retard fournisseur AeroMat FR sur livraison titane",
      siteCode: SEED_SITES.LYO,
      actorId: SEED_USER_IDS.logistique,
      metadata: { supplier: "AeroMat FR" },
      timestamp: new Date("2026-01-13T15:00:00.000Z")
    },
    {
      severity: "CRITICAL",
      type: "stock.material.out",
      message: "Rupture graisse aéronautique — réapprovisionnement urgent",
      siteCode: SEED_SITES.LYO,
      actorId: SEED_USER_IDS.logistique,
      metadata: { materialCode: SEED_MATERIALS.GRAISSE },
      timestamp: new Date("2026-01-14T14:00:00.000Z")
    }
  ];

  for (const event of criticalEvents) {
    await criticalCollection.updateOne(
      { type: event.type, siteCode: event.siteCode, timestamp: event.timestamp },
      { $set: event },
      { upsert: true }
    );
  }

  for (const doc of SEED_AUDIT_DOCUMENTS) {
    await documentCollection.updateOne(
      { id: doc.id },
      {
        $set: {
          ...doc,
          uploadedAt: new Date("2026-01-14T10:00:00.000Z")
        }
      },
      { upsert: true }
    );
  }
}

/** @deprecated Use seedDemoScenario */
export async function seedDemoLot(db: Db) {
  return seedDemoScenario(db);
}
