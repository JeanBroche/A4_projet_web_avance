import type { ActionSchema, Service } from "moleculer";
import {
  DocumentValidationError,
  deleteDocumentObject,
  uploadSiteDocument
} from "@aeronexis/storage";
import { assertSiteAccess, createError, parseParams, requireAdmin } from "@aeronexis/services-shared";
import { getDb } from "../../src/db.js";
import { insertDocumentRecord } from "../../src/lib/document-store.js";
import { siteDocumentUploadSchema } from "../../src/lib/schemas.js";

export const siteDocumentUploadAction: ActionSchema = {
  async handler(this: Service, ctx) {
    const params = parseParams(siteDocumentUploadSchema, ctx.params);
    const auth = await requireAdmin(ctx, params.accessToken);

    assertSiteAccess(auth, params.siteCode);

    let body: Buffer;
    try {
      body = Buffer.from(params.contentBase64, "base64");
    } catch {
      throw createError("VALIDATION_ERROR", "contentBase64 is not valid base64");
    }

    let stored;
    try {
      stored = await uploadSiteDocument({
        siteCode: params.siteCode,
        filename: params.filename,
        contentType: params.contentType,
        body,
        uploadedBy: auth.sub,
        category: params.category
      });
    } catch (error) {
      if (error instanceof DocumentValidationError) {
        throw createError("VALIDATION_ERROR", error.message, error.details);
      }
      throw error;
    }

    const db = getDb();
    try {
      await insertDocumentRecord(db, stored);
    } catch (error) {
      await deleteDocumentObject(stored.objectKey).catch(() => undefined);
      throw error;
    }

    this.logger.info("Site document uploaded", {
      correlationId: (ctx.meta as { correlationId?: string }).correlationId,
      documentId: stored.id,
      siteCode: stored.siteCode,
      category: stored.category ?? null
    });

    return {
      id: stored.id,
      siteCode: stored.siteCode,
      filename: stored.filename,
      contentType: stored.contentType,
      sizeBytes: stored.sizeBytes,
      uploadedBy: stored.uploadedBy,
      category: stored.category ?? null,
      uploadedAt: stored.uploadedAt.toISOString()
    };
  }
};
