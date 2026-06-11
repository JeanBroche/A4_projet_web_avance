import type { ActionSchema } from "moleculer";
import { getDocumentBuffer } from "@aeronexis/storage";
import { assertSiteAccess, createError, parseParams, requireAuth } from "@aeronexis/services-shared";
import { getDb } from "../../src/db.js";
import { findSiteDocumentById } from "../../src/lib/document-store.js";
import { siteDocumentGetSchema } from "../../src/lib/schemas.js";

export const siteDocumentGetAction: ActionSchema = {
  async handler(ctx) {
    const params = parseParams(siteDocumentGetSchema, ctx.params);
    const auth = await requireAuth(ctx, params.accessToken);

    const db = getDb();
    const record = await findSiteDocumentById(db, params.id);
    if (!record) {
      throw createError("NOT_FOUND", "Document not found");
    }

    assertSiteAccess(auth, record.siteCode);

    const { buffer, contentType } = await getDocumentBuffer(record.objectKey);

    return {
      id: record.id,
      siteCode: record.siteCode,
      filename: record.filename,
      contentType: record.contentType,
      sizeBytes: record.sizeBytes,
      uploadedBy: record.uploadedBy,
      category: record.category ?? null,
      uploadedAt:
        record.uploadedAt instanceof Date
          ? record.uploadedAt.toISOString()
          : record.uploadedAt,
      content: buffer.toString("base64")
    };
  }
};
