import { z } from "zod";

const accessTokenSchema = z
  .object({ accessToken: z.string().min(1).optional() })
  .partial();

const paginationSchema = {
  limit: z.number().int().positive().max(500).optional(),
  offset: z.number().int().nonnegative().optional()
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
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  ...paginationSchema
});

export const lotTraceSchema = accessTokenSchema.extend({
  lotId: z.string().regex(/^LOT-\d{4}-\d{5}$/, "lotId must match LOT-YYYY-NNNNN")
});

export const lotExportSchema = lotTraceSchema;
