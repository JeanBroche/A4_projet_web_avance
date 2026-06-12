import { z } from "zod";

const accessTokenSchema = z
  .object({ accessToken: z.string().min(1).optional() })
  .partial();

const paginationSchema = {
  limit: z.coerce.number().int().positive().max(500).optional(),
  offset: z.coerce.number().int().nonnegative().optional()
};

export const changeListSchema = accessTokenSchema.extend({
  entity: z.string().min(1).optional(),
  entityId: z.string().min(1).optional(),
  userId: z.string().min(1).optional(),
  siteCode: z.string().min(1).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  ...paginationSchema
});

export const eventRecordSchema = accessTokenSchema.extend({
  severity: z.enum(["CRITICAL", "WARNING"]),
  type: z.string().min(1),
  message: z.string().min(1),
  siteCode: z.string().min(1).optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export const eventListCriticalSchema = accessTokenSchema.extend({
  severity: z.enum(["CRITICAL", "WARNING"]).optional(),
  siteCode: z.string().min(1).optional(),
  siteId: z.string().min(1).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  ...paginationSchema
});

const LOT_ID_PATTERN = /^(LOT-\d{4}-\d{5}|BATCH-[A-Z0-9-]+)$/i;

export const lotTraceSchema = accessTokenSchema.extend({
  lotId: z.string().regex(LOT_ID_PATTERN, "lotId must match LOT-YYYY-NNNNN or BATCH-*")
});

export const lotExportSchema = lotTraceSchema;

export const documentUploadSchema = accessTokenSchema.extend({
  lotId: z.string().regex(LOT_ID_PATTERN, "lotId must match LOT-YYYY-NNNNN or BATCH-*"),
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1).max(128),
  contentBase64: z.string().min(1)
});

export const documentListSchema = accessTokenSchema.extend({
  lotId: z.string().regex(LOT_ID_PATTERN, "lotId must match LOT-YYYY-NNNNN or BATCH-*")
});

export const documentUrlSchema = accessTokenSchema.extend({
  documentId: z.string().uuid(),
  expiresSec: z.number().int().positive().max(86_400).optional()
});

export const documentDownloadSchema = accessTokenSchema.extend({
  documentId: z.string().uuid()
});
