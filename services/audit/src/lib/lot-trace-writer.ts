import type { Db } from "mongodb";
import { resolveLotIdentity } from "@aeronexis/shared";
import { COLLECTIONS } from "../db.js";
import type { EventHistoryDocument, LotProgressDocument } from "./audit-helpers.js";

export type LotProgressInput = {
  batchCode?: string | null;
  orderNumber?: string | null;
  siteCode: string;
  status: string;
  productCode?: string;
  correlationId?: string;
};

export type EventHistoryInput = {
  type: string;
  batchCode?: string | null;
  orderNumber?: string | null;
  ofId?: string;
  lotId?: string;
  siteCode?: string;
  payload?: Record<string, unknown>;
  correlationId?: string;
  timestamp?: Date;
};

function resolveIds(input: {
  batchCode?: string | null;
  orderNumber?: string | null;
  ofId?: string;
  lotId?: string;
}) {
  if (input.ofId && input.lotId) {
    return { lotId: input.lotId, ofId: input.ofId };
  }
  if (input.ofId) {
    return { lotId: input.ofId, ofId: input.ofId };
  }
  if (input.lotId) {
    return { lotId: input.lotId, ofId: input.lotId };
  }
  return resolveLotIdentity({
    batchCode: input.batchCode,
    orderNumber: input.orderNumber
  });
}

export async function upsertLotProgress(db: Db, input: LotProgressInput) {
  const { lotId, ofId } = resolveLotIdentity({
    batchCode: input.batchCode,
    orderNumber: input.orderNumber
  });
  const now = new Date();

  const existing = await db
    .collection<LotProgressDocument>(COLLECTIONS.lotProgressAudit)
    .findOne({ $or: [{ lotId }, { ofId }] });

  const document: LotProgressDocument = {
    lotId,
    ofId,
    siteCode: input.siteCode,
    status: input.status,
    productCode: input.productCode ?? existing?.productCode,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now
  };

  await db
    .collection<LotProgressDocument>(COLLECTIONS.lotProgressAudit)
    .updateOne({ lotId }, { $set: document }, { upsert: true });

  return document;
}

export async function appendEventHistory(db: Db, input: EventHistoryInput) {
  const { lotId, ofId } = resolveIds(input);
  const document: EventHistoryDocument = {
    type: input.type,
    lotId,
    ofId,
    siteCode: input.siteCode,
    payload: input.payload,
    correlationId: input.correlationId,
    timestamp: input.timestamp ?? new Date()
  };

  const result = await db.collection<EventHistoryDocument>(COLLECTIONS.eventHistory).insertOne(document);
  return { id: result.insertedId.toString(), ...document };
}

export async function findLotProgress(db: Db, key: string): Promise<LotProgressDocument | null> {
  return db.collection<LotProgressDocument>(COLLECTIONS.lotProgressAudit).findOne({
    $or: [{ lotId: key }, { ofId: key }]
  });
}
