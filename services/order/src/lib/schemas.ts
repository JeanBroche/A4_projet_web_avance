import { z } from "zod";

const accessTokenSchema = z
  .object({ accessToken: z.string().min(1).optional() })
  .partial();

const siteCodeSchema = z.string().min(1);
const cuidLikeSchema = z.string().min(1);
const optionalLimit = z.coerce.number().int().positive().max(500).optional();
const optionalOffset = z.coerce.number().int().nonnegative().optional();

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
  carrier: z.string().min(1).optional(),
  deliveryAddress: z.string().min(1).optional(),
  emoji: z.string().min(1).optional(),
  lines: z.array(orderLineSchema).min(1)
});

export const orderUpdateSchema = accessTokenSchema.extend({
  orderId: cuidLikeSchema,
  clientName: z.string().min(1).optional(),
  destination: z.string().min(1).optional(),
  promisedDeliveryDate: z.coerce.date().optional(),
  isUrgent: z.boolean().optional(),
  itemsCount: z.number().int().positive().optional(),
  carrier: z.string().min(1).optional(),
  emoji: z.string().min(1).optional()
});

export const orderDeleteSchema = accessTokenSchema.extend({
  orderId: cuidLikeSchema
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

export const clientListSchema = accessTokenSchema.extend({
  siteCode: siteCodeSchema.optional(),
  siteId: siteCodeSchema.optional(),
  code: z.string().min(1).optional(),
  limit: optionalLimit,
  offset: optionalOffset
});

export const clientGetSchema = accessTokenSchema
  .extend({
    clientId: cuidLikeSchema.optional(),
    code: z.string().min(1).optional(),
    siteCode: siteCodeSchema.optional(),
    siteId: siteCodeSchema.optional()
  })
  .superRefine((value, ctx) => {
    if (!value.clientId && (!value.code || !value.siteCode)) {
      ctx.addIssue({
        code: "custom",
        message: "clientId or code+siteCode is required",
        path: ["clientId"]
      });
    }
  });

export const clientUpsertSchema = accessTokenSchema.extend({
  code: z.string().min(1),
  name: z.string().min(1),
  siteCode: siteCodeSchema,
  country: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  annualRevenue: z.number().int().nonnegative().optional(),
  firstContractDate: z.coerce.date().optional(),
  status: z.enum(["active", "inactive"]).optional()
});

export const orderHistorySchema = accessTokenSchema.extend({
  clientId: cuidLikeSchema.optional(),
  siteCode: siteCodeSchema.optional(),
  siteId: siteCodeSchema.optional(),
  limit: optionalLimit,
  offset: optionalOffset
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

export const orderSetLogisticsStatusSchema = accessTokenSchema.extend({
  orderId: cuidLikeSchema,
  status: z.enum(["prepared", "shipped", "delivered"]),
  notes: z.string().min(1).optional()
});
