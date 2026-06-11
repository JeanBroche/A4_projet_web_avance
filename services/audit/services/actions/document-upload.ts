import type { ActionSchema, Service } from "moleculer";
import { uploadDocument } from "@aeronexis/storage";
import { createError, parseParams, requireAnyRole } from "@aeronexis/services-shared";
import { getDb } from "../../src/db.js";
import { insertDocumentRecord } from "../../src/lib/document-store.js";
import { documentUploadSchema } from "../../src/lib/schemas.js";

export const documentUploadAction: ActionSchema = {
  async handler(this: Service, ctx) {
    const params = parseParams(documentUploadSchema, ctx.params);
    const auth = await requireAnyRole(ctx, params.accessToken, [
      "operateur",
      "logistique",
      "admin"
    ]);

    let body: Buffer;
    try {
      body = Buffer.from(params.contentBase64, "base64");
    } catch {
      throw createError("VALIDATION_ERROR", "contentBase64 is not valid base64");
    }

    if (body.length === 0) {
      throw createError("VALIDATION_ERROR", "contentBase64 must not decode to empty content");
    }

    const maxBytes = Number(process.env.DOCUMENT_UPLOAD_MAX_BYTES ?? 10 * 1024 * 1024);
    if (body.length > maxBytes) {
      throw createError("VALIDATION_ERROR", `File exceeds maximum size of ${maxBytes} bytes`);
    }

    const stored = await uploadDocument({
      lotId: params.lotId,
      filename: params.filename,
      contentType: params.contentType,
      body,
      uploadedBy: auth.email ?? auth.sub
    });

    const db = getDb();
    await insertDocumentRecord(db, stored);

    this.logger.info("Document uploaded", {
      correlationId: (ctx.meta as { correlationId?: string }).correlationId,
      lotId: params.lotId,
      documentId: stored.id,
      sizeBytes: stored.sizeBytes
    });

    return {
      id: stored.id,
      lotId: stored.lotId,
      filename: stored.filename,
      contentType: stored.contentType,
      sizeBytes: stored.sizeBytes,
      uploadedAt: stored.uploadedAt.toISOString()
    };
  }
};
