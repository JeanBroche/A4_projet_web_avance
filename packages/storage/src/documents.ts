import { randomUUID } from "node:crypto";
import { getMinioClient } from "./client.js";
import { getStorageConfig } from "./config.js";

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

function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
}

export function buildDocumentObjectKey(lotId: string, documentId: string, filename: string) {
  return `lots/${lotId}/${documentId}/${sanitizeFilename(filename)}`;
}

export async function uploadDocument(input: UploadDocumentInput): Promise<StoredDocumentMeta> {
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

export async function getDocumentDownloadUrl(objectKey: string, expiresSec = 3600) {
  const config = getStorageConfig();
  const client = getMinioClient();
  return client.presignedGetObject(config.bucket, objectKey, expiresSec);
}

export async function deleteDocumentObject(objectKey: string) {
  const config = getStorageConfig();
  const client = getMinioClient();
  await client.removeObject(config.bucket, objectKey);
}
