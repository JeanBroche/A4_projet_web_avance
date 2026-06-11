import { randomUUID } from "node:crypto";
import { getMinioClient } from "./client.js";
import { getStorageConfig } from "./config.js";
import { validateDocumentFile } from "./validation.js";

export type UploadDocumentInput = {
  lotId: string;
  filename: string;
  contentType: string;
  body: Buffer;
  uploadedBy: string;
};

export type StoredDocumentMeta = {
  id: string;
  lotId: string;
  filename: string;
  contentType: string;
  objectKey: string;
  sizeBytes: number;
  uploadedBy: string;
  uploadedAt: Date;
};

export type SiteDocumentCategory = "certificat" | "pj";

export type UploadSiteDocumentInput = {
  siteCode: string;
  filename: string;
  contentType: string;
  body: Buffer;
  uploadedBy: string;
  category?: SiteDocumentCategory;
};

export type StoredSiteDocumentMeta = {
  id: string;
  siteCode: string;
  filename: string;
  contentType: string;
  objectKey: string;
  sizeBytes: number;
  uploadedBy: string;
  uploadedAt: Date;
  category?: SiteDocumentCategory;
};

export type DocumentAttachmentRecord = StoredDocumentMeta | StoredSiteDocumentMeta;

export function sanitizeFilename(filename: string): string {
  const base = filename.replace(/\\/g, "/").split("/").pop() ?? "file";
  const safe = base.replace(/[^\w.\-()+ ]/g, "_").slice(0, 200);
  return safe.length > 0 ? safe : "file";
}

export function buildDocumentObjectKey(lotId: string, documentId: string, filename: string) {
  return `lots/${lotId}/${documentId}/${sanitizeFilename(filename)}`;
}

export function buildSiteStorageKey(
  siteCode: string,
  documentId: string,
  filename: string,
  uploadedAt: Date = new Date()
): string {
  const year = uploadedAt.getUTCFullYear();
  return `${siteCode}/${year}/${documentId}/${sanitizeFilename(filename)}`;
}

export async function uploadDocument(input: UploadDocumentInput): Promise<StoredDocumentMeta> {
  validateDocumentFile(input.contentType, input.body.length);

  const config = getStorageConfig();
  const client = getMinioClient();
  const id = randomUUID();
  const objectKey = buildDocumentObjectKey(input.lotId, id, input.filename);

  await client.putObject(config.bucket, objectKey, input.body, input.body.length, {
    "Content-Type": input.contentType,
    "X-Amz-Meta-Uploaded-By": input.uploadedBy,
    "X-Amz-Meta-Lot-Id": input.lotId
  });

  return {
    id,
    lotId: input.lotId,
    filename: input.filename,
    contentType: input.contentType,
    objectKey,
    sizeBytes: input.body.length,
    uploadedBy: input.uploadedBy,
    uploadedAt: new Date()
  };
}

export async function uploadSiteDocument(
  input: UploadSiteDocumentInput
): Promise<StoredSiteDocumentMeta> {
  validateDocumentFile(input.contentType, input.body.length);

  const config = getStorageConfig();
  const client = getMinioClient();
  const id = randomUUID();
  const uploadedAt = new Date();
  const objectKey = buildSiteStorageKey(input.siteCode, id, input.filename, uploadedAt);

  await client.putObject(config.bucket, objectKey, input.body, input.body.length, {
    "Content-Type": input.contentType,
    "X-Amz-Meta-Uploaded-By": input.uploadedBy,
    "X-Amz-Meta-Site-Code": input.siteCode,
    ...(input.category ? { "X-Amz-Meta-Category": input.category } : {})
  });

  return {
    id,
    siteCode: input.siteCode,
    filename: input.filename,
    contentType: input.contentType,
    objectKey,
    sizeBytes: input.body.length,
    uploadedBy: input.uploadedBy,
    uploadedAt,
    category: input.category
  };
}

export async function getDocumentDownloadUrl(objectKey: string, expiresSec = 3600) {
  const config = getStorageConfig();
  const client = getMinioClient();
  return client.presignedGetObject(config.bucket, objectKey, expiresSec);
}

export async function getDocumentBuffer(objectKey: string): Promise<{
  buffer: Buffer;
  contentType: string;
}> {
  const config = getStorageConfig();
  const client = getMinioClient();
  const stream = await client.getObject(config.bucket, objectKey);
  const chunks: Buffer[] = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const stat = await client.statObject(config.bucket, objectKey);
  const contentType =
    stat.metaData?.["content-type"] ??
    stat.metaData?.["Content-Type"] ??
    "application/octet-stream";

  return {
    buffer: Buffer.concat(chunks),
    contentType
  };
}

export async function deleteDocumentObject(objectKey: string) {
  const config = getStorageConfig();
  const client = getMinioClient();
  await client.removeObject(config.bucket, objectKey);
}

export function isSiteDocument(record: DocumentAttachmentRecord): record is StoredSiteDocumentMeta {
  return "siteCode" in record && typeof record.siteCode === "string";
}
