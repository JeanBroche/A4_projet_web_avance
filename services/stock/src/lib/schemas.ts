import { z } from "zod";

const accessTokenSchema = z
  .object({ accessToken: z.string().min(1).optional() })
  .partial();

const siteCodeSchema = z.string().min(1);
const materialIdSchema = z.string().min(1);
const cuidLikeSchema = z.string().min(1);

const reservationLineSchema = z.object({
  materialId: materialIdSchema,
  qty: z.number().int().positive()
});

export const levelListSchema = accessTokenSchema.extend({
  siteId: siteCodeSchema.optional(),
  siteCode: siteCodeSchema.optional(),
  code: z.string().min(1).optional()
});

export const levelConsolidateSchema = accessTokenSchema.extend({
  siteId: siteCodeSchema.optional(),
  siteCode: siteCodeSchema.optional(),
  code: z.string().min(1).optional()
});

export const reservationCreateSchema = accessTokenSchema.extend({
  ofId: z.string().min(1),
  siteCode: siteCodeSchema.optional(),
  lines: z.array(reservationLineSchema).min(1)
});

export const reservationByIdSchema = accessTokenSchema.extend({
  id: cuidLikeSchema
});

export const reservationListSchema = accessTokenSchema.extend({
  ofId: z.string().min(1).optional(),
  siteCode: siteCodeSchema.optional(),
  siteId: siteCodeSchema.optional(),
  status: z.enum(["ACTIVE", "RELEASED", "CANCELLED"]).optional(),
  limit: z.number().int().positive().max(500).optional(),
  offset: z.number().int().nonnegative().optional()
});

export const movementCreateSchema = accessTokenSchema.extend({
  materialId: materialIdSchema,
  siteCode: siteCodeSchema,
  type: z.enum(["IN", "OUT", "ADJUST"]),
  quantity: z.number().int().positive(),
  reason: z.string().min(1).optional(),
  documentRef: z.string().min(1).optional()
});

export const movementListSchema = accessTokenSchema.extend({
  siteId: siteCodeSchema.optional(),
  siteCode: siteCodeSchema.optional(),
  materialId: materialIdSchema.optional(),
  type: z.enum(["IN", "OUT", "ADJUST"]).optional(),
  limit: z.number().int().positive().max(500).optional(),
  offset: z.number().int().nonnegative().optional()
});

export const alertListSchema = accessTokenSchema.extend({
  siteId: siteCodeSchema.optional(),
  siteCode: siteCodeSchema.optional(),
  includeResolved: z.boolean().optional()
});

export const thresholdUpsertSchema = accessTokenSchema.extend({
  materialId: materialIdSchema,
  minimumStock: z.number().int().nonnegative()
});

export const forecastRuptureSchema = accessTokenSchema.extend({
  siteId: siteCodeSchema.optional(),
  siteCode: siteCodeSchema.optional(),
  windowDays: z.number().int().positive().max(365).optional()
});

export const supplierDelayListSchema = accessTokenSchema.extend({
  materialId: materialIdSchema.optional(),
  supplier: z.string().min(1).optional()
});

export const supplierDelayNotifySchema = accessTokenSchema.extend({
  materialId: materialIdSchema,
  supplier: z.string().min(1),
  expectedDate: z.coerce.date(),
  actualDate: z.coerce.date().optional(),
  notes: z.string().min(1).optional()
});
