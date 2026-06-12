import type { ActionSchema, Service } from "moleculer";
import { getDocumentObject } from "@aeronexis/storage";
import { createError, parseParams, requireAnyRole } from "@aeronexis/services-shared";
import { getDb } from "../../src/db.js";
import { findDocumentById } from "../../src/lib/document-store.js";
import { documentDownloadSchema } from "../../src/lib/schemas.js";

export const documentDownloadAction: ActionSchema = {
  async handler(this: Service, ctx) {
    const params = parseParams(documentDownloadSchema, ctx.params);
    await requireAnyRole(ctx, params.accessToken, [
      "operateur",
      "logistique",
      "admin",
      "commercial",
      "direction"
    ]);

    const db = getDb();
    const record = await findDocumentById(db, params.documentId);
    if (!record) {
      throw createError("NOT_FOUND", "Document not found");
    }

    const { body, sizeBytes } = await getDocumentObject(record.objectKey);

    this.logger.info("Document downloaded", {
      correlationId: (ctx.meta as { correlationId?: string }).correlationId,
      documentId: record.id,
      lotId: record.lotId,
      sizeBytes
    });

    return {
      id: record.id,
      lotId: record.lotId,
      filename: record.filename,
      contentType: record.contentType,
      sizeBytes,
      contentBase64: body.toString("base64")
    };
  }
};
