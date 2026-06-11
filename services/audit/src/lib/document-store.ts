import type { Db, WithId } from "mongodb";
import type { StoredDocumentMeta } from "@aeronexis/storage";
import { COLLECTIONS } from "../db.js";

export type DocumentAttachmentRecord = StoredDocumentMeta;

export async function insertDocumentRecord(db: Db, record: DocumentAttachmentRecord) {
  await db.collection(COLLECTIONS.documentAttachments).insertOne(record);
  return record;
}

export async function findDocumentsByLotId(db: Db, lotId: string) {
  return db
    .collection<DocumentAttachmentRecord>(COLLECTIONS.documentAttachments)
    .find({ lotId })
    .sort({ uploadedAt: -1 })
    .toArray();
}

export async function findDocumentById(db: Db, id: string) {
  return db
    .collection<DocumentAttachmentRecord>(COLLECTIONS.documentAttachments)
    .findOne({ id }) as Promise<WithId<DocumentAttachmentRecord> | null>;
}
