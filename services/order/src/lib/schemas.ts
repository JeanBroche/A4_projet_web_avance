import { z } from "zod";

const accessTokenSchema = z
  .object({ accessToken: z.string().min(1).optional() })
  .partial();

const siteCodeSchema = z.string().min(1);
const cuidLikeSchema = z.string().min(1);

const orderLineSchema = z.object({
  productCode: z.string().min(1),
  description: z.string().min(1).optional(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().int().nonnegative().optional(),
  ofId: z.string().min(1).optional()
});

export const orderCreateSchema = accessTokenSchema.extend({
  clientId: cuidLikeSchema,
  siteCode: siteCodeSchema,
  promisedDeliveryDate: z.coerce.date().optional(),
  isUrgent: z.boolean().optional(),
  dueDate: z.coerce.date().optional(),
  lines: z.array(orderLineSchema).min(1)
});

export const orderByIdSchema = accessTokenSchema.extend({
  orderId: cuidLikeSchema,
  siteCode: siteCodeSchema.optional(),
  siteId: siteCodeSchema.optional()
});

export const orderSetPrioritySchema = accessTokenSchema.extend({
  orderId: cuidLikeSchema,
  isUrgent: z.boolean(),
  dueDate: z.coerce.date().optional()
});

export const orderListUrgentSchema = accessTokenSchema.extend({
  siteCode: siteCodeSchema.optional(),
  siteId: siteCodeSchema.optional()
});

export const orderDelayRiskSchema = accessTokenSchema.extend({
  orderId: cuidLikeSchema
});

export const clientStatsSchema = accessTokenSchema.extend({
  clientId: cuidLikeSchema
});

export const orderHistorySchema = accessTokenSchema.extend({
  clientId: cuidLikeSchema.optional(),
  siteCode: siteCodeSchema.optional(),
  siteId: siteCodeSchema.optional(),
  limit: z.number().int().positive().max(500).optional(),
  offset: z.number().int().nonnegative().optional()
});

export const orderValidateSchema = accessTokenSchema.extend({
  orderId: cuidLikeSchema,
  notes: z.string().min(1).optional()
});

export const orderRejectSchema = accessTokenSchema.extend({
  orderId: cuidLikeSchema,
  reason: z.string().min(1)
});

export const orderStartProductionSchema = accessTokenSchema.extend({
  orderId: cuidLikeSchema,
  bom_code: z.string().min(1).optional(),
  plannedStartAt: z.coerce.date().optional(),
  plannedEndAt: z.coerce.date().optional(),
  notes: z.string().min(1).optional()
});

export const orderFinishSchema = accessTokenSchema.extend({
  orderId: cuidLikeSchema,
  notes: z.string().min(1).optional()
});

export const orderMarkShippedSchema = accessTokenSchema.extend({
  orderId: cuidLikeSchema,
  notes: z.string().min(1).optional()
});

export const orderMarkDeliveredSchema = accessTokenSchema.extend({
  orderId: cuidLikeSchema,
  notes: z.string().min(1).optional()
});
