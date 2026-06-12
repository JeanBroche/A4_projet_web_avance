import { z } from "zod";

const accessTokenSchema = z
  .object({ accessToken: z.string().min(1).optional() })
  .partial();

const siteCodeSchema = z.string().min(1);
const materialIdSchema = z.string().min(1);
const cuidLikeSchema = z.string().min(1);

const reservationQtySchema = z
  .number()
  .positive()
  .transform((qty) => (Number.isInteger(qty) ? qty : Math.ceil(qty)));

const reservationLineSchema = z.object({
  materialId: materialIdSchema,
  qty: reservationQtySchema
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

export const reservationUpdateSchema = reservationByIdSchema.extend({
  qty: reservationQtySchema
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

export const materialListSchema = accessTokenSchema.extend({
  siteId: siteCodeSchema.optional(),
  siteCode: siteCodeSchema.optional(),
  code: z.string().min(1).optional(),
  limit: z.number().int().positive().max(500).optional(),
  offset: z.number().int().nonnegative().optional()
});

export const materialGetSchema = accessTokenSchema
  .extend({
    materialId: materialIdSchema.optional(),
    code: z.string().min(1).optional(),
    siteCode: siteCodeSchema.optional(),
    siteId: siteCodeSchema.optional()
  })
  .superRefine((value, ctx) => {
    if (!value.materialId && (!value.code || !value.siteCode)) {
      ctx.addIssue({
        code: "custom",
        message: "materialId or code+siteCode is required",
        path: ["materialId"]
      });
    }
  });

export const materialUpsertSchema = accessTokenSchema.extend({
  code: z.string().min(1),
  siteCode: siteCodeSchema,
  description: z.string().min(1).optional(),
  unit: z.string().min(1).default("pcs"),
  currentStock: z.number().int().nonnegative().optional(),
  minimumStock: z.number().int().nonnegative().optional(),
  supplier: z.string().min(1).optional()
});
