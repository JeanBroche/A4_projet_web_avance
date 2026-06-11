import type { Db, WithId } from "mongodb";
import type { DocumentAttachmentRecord } from "@aeronexis/storage";
import { COLLECTIONS } from "../db.js";

export type { DocumentAttachmentRecord };

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

export async function findDocumentsBySiteCode(
  db: Db,
  siteCode: string,
  category?: "certificat" | "pj"
) {
  const filter: { siteCode: string; category?: "certificat" | "pj" } = { siteCode };
  if (category) {
    filter.category = category;
  }

  return db
    .collection<DocumentAttachmentRecord>(COLLECTIONS.documentAttachments)
    .find(filter)
    .sort({ uploadedAt: -1 })
    .toArray();
}

export async function findDocumentById(db: Db, id: string) {
  return db
    .collection<DocumentAttachmentRecord>(COLLECTIONS.documentAttachments)
    .findOne({ id }) as Promise<WithId<DocumentAttachmentRecord> | null>;
}

export async function findSiteDocumentById(db: Db, id: string) {
  const record = await findDocumentById(db, id);
  if (!record || !("siteCode" in record) || !record.siteCode) {
    return null;
  }
  return record;
}
