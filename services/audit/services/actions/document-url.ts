import type { ActionSchema } from "moleculer";
import { getDocumentDownloadUrl } from "@aeronexis/storage";
import { createError, parseParams, requireAnyRole } from "@aeronexis/services-shared";
import { getDb } from "../../src/db.js";
import { findDocumentById } from "../../src/lib/document-store.js";
import { documentUrlSchema } from "../../src/lib/schemas.js";

export const documentUrlAction: ActionSchema = {
  async handler(ctx) {
    const params = parseParams(documentUrlSchema, ctx.params);
    await requireAnyRole(ctx, params.accessToken, ["operateur", "logistique", "admin"]);

    const db = getDb();
    const record = await findDocumentById(db, params.documentId);
    if (!record) {
      throw createError("NOT_FOUND", "Document not found");
    }

    const expiresSec = params.expiresSec ?? 3600;
    const url = await getDocumentDownloadUrl(record.objectKey, expiresSec);

    return {
      documentId: record.id,
      lotId: record.lotId,
      filename: record.filename,
      url,
      expiresSec
    };
  }
};
