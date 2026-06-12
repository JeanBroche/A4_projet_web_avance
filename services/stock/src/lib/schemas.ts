import { z } from "zod";

const accessTokenSchema = z
  .object({ accessToken: z.string().min(1).optional() })
  .partial();

const siteCodeSchema = z.string().min(1);
const materialIdSchema = z.string().min(1);
const cuidLikeSchema = z.string().min(1);
const optionalLimit = z.coerce.number().int().positive().max(500).optional();
const optionalOffset = z.coerce.number().int().nonnegative().optional();

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
  limit: optionalLimit,
  offset: optionalOffset
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
  limit: optionalLimit,
  offset: optionalOffset
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
  windowDays: z.coerce.number().int().positive().max(365).optional()
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
  limit: optionalLimit,
  offset: optionalOffset
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

export const lotCreateSchema = accessTokenSchema.extend({
  materialId: materialIdSchema,
  siteCode: siteCodeSchema,
  lotNumber: z.string().min(1),
  supplierLot: z.string().min(1).optional(),
  supplier: z.string().min(1).optional(),
  certificateRef: z.string().min(1).optional(),
  certificateUrl: z.string().url().optional(),
  manufacturedAt: z.coerce.date().optional(),
  expiryAt: z.coerce.date().optional(),
  receivedAt: z.coerce.date().optional(),
  quantity: z.number().int().positive(),
  location: z.string().min(1).optional(),
  notes: z.string().min(1).optional()
});

export const lotListSchema = accessTokenSchema.extend({
  siteId: siteCodeSchema.optional(),
  siteCode: siteCodeSchema.optional(),
  materialId: materialIdSchema.optional(),
  status: z.enum(["ACTIVE", "EXHAUSTED", "QUARANTINE", "EXPIRED"]).optional(),
  limit: optionalLimit,
  offset: optionalOffset
});

export const lotUpdateSchema = accessTokenSchema.extend({
  id: cuidLikeSchema,
  status: z.enum(["ACTIVE", "EXHAUSTED", "QUARANTINE", "EXPIRED"]).optional(),
  location: z.string().min(1).optional(),
  remainingQty: z.number().int().nonnegative().optional(),
  notes: z.string().min(1).optional()
});

export const purchaseOrderCreateSchema = accessTokenSchema.extend({
  materialId: materialIdSchema,
  siteCode: siteCodeSchema,
  supplier: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative().optional(),
  expectedDate: z.coerce.date().optional(),
  notes: z.string().min(1).optional()
});

export const purchaseOrderListSchema = accessTokenSchema.extend({
  siteId: siteCodeSchema.optional(),
  siteCode: siteCodeSchema.optional(),
  materialId: materialIdSchema.optional(),
  status: z.enum(["DRAFT", "ORDERED", "PARTIAL", "RECEIVED", "CANCELLED"]).optional(),
  supplier: z.string().min(1).optional(),
  limit: optionalLimit,
  offset: optionalOffset
});

export const purchaseOrderUpdateSchema = accessTokenSchema.extend({
  id: cuidLikeSchema,
  status: z.enum(["DRAFT", "ORDERED", "PARTIAL", "RECEIVED", "CANCELLED"]).optional(),
  expectedDate: z.coerce.date().optional(),
  notes: z.string().min(1).optional()
});

export const purchaseOrderReceiveSchema = accessTokenSchema.extend({
  id: cuidLikeSchema,
  receivedQty: z.number().int().positive()
});

export const transferCreateSchema = accessTokenSchema.extend({
  materialId: materialIdSchema,
  sourceSiteCode: siteCodeSchema,
  destSiteCode: siteCodeSchema,
  quantity: z.number().int().positive(),
  reason: z.string().min(1).optional(),
  notes: z.string().min(1).optional()
}).superRefine((value, ctx) => {
  if (value.sourceSiteCode === value.destSiteCode) {
    ctx.addIssue({
      code: "custom",
      message: "Source and destination sites must differ",
      path: ["destSiteCode"]
    });
  }
});
