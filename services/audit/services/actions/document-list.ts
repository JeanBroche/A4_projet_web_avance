import type { ActionSchema } from "moleculer";
import { parseParams, requireAnyRole } from "@aeronexis/services-shared";
import { getDb } from "../../src/db.js";
import { findDocumentsByLotId } from "../../src/lib/document-store.js";
import { documentListSchema } from "../../src/lib/schemas.js";

export const documentListAction: ActionSchema = {
  async handler(ctx) {
    const params = parseParams(documentListSchema, ctx.params);
    await requireAnyRole(ctx, params.accessToken, ["operateur", "logistique", "admin"]);

    const db = getDb();
    const items = await findDocumentsByLotId(db, params.lotId);

    return {
      lotId: params.lotId,
      total: items.length,
      items: items.map((item) => ({
        id: item.id,
        filename: item.filename,
        contentType: item.contentType,
        sizeBytes: item.sizeBytes,
        uploadedBy: item.uploadedBy,
        uploadedAt: item.uploadedAt instanceof Date ? item.uploadedAt.toISOString() : item.uploadedAt
      }))
    };
  }
};
