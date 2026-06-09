import { z } from "zod";

const accessTokenSchema = z
  .object({ accessToken: z.string().min(1).optional() })
  .partial();

export const listBomSchema = accessTokenSchema.extend({
  status: z.string().min(1).optional(),
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().min(0).optional()
});

export const listBatchSchema = accessTokenSchema.extend({
  status: z.string().min(1).optional(),
  bom_code: z.string().min(1).optional(),
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().min(0).optional()
});

export const getBatchSchema = accessTokenSchema.extend({
  batch_code: z.string().min(1)
});

export const createBatchSchema = accessTokenSchema.extend({
  bom_code: z.string().min(1),
  command_id: z.string().min(1),
  plannedStartAt: z.coerce.date().optional(),
  plannedEndAt: z.coerce.date().optional()
});

export const updateBatchSchema = accessTokenSchema.extend({
  batch_code: z.string().min(1),
  bom_code: z.string().min(1).optional(),
  status: z.string().min(1).optional()
});

export const deleteBatchSchema = accessTokenSchema.extend({
  batch_code: z.string().min(1)
});

export const batchProgressSchema = accessTokenSchema.extend({
  batch_code: z.string().min(1),
  percent: z.number().int().min(0).max(100)
});

export const batchRescheduleSchema = accessTokenSchema.extend({
  batch_code: z.string().min(1),
  plannedStartAt: z.coerce.date(),
  plannedEndAt: z.coerce.date()
});

export const batchHistorySchema = accessTokenSchema.extend({
  batch_code: z.string().min(1),
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().min(0).optional()
});

export const batchStepsListSchema = accessTokenSchema.extend({
  batch_code: z.string().min(1)
});

export const batchStepUpdateSchema = accessTokenSchema.extend({
  batch_code: z.string().min(1),
  step_code: z.string().min(1),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"])
});

export const addBatchAnomalySchema = accessTokenSchema.extend({
  batch_id: z.string().min(1),
  description: z.string().min(1)
});

export const updateBatchAnomalySchema = accessTokenSchema.extend({
  batch_id: z.string().min(1),
  anomaly_code: z.string().min(1),
  description: z.string().min(1).optional(),
  status: z.enum(["OPEN", "CLOSED"]).optional()
});

export const getBomSchema = accessTokenSchema.extend({
  bom_code: z.string().min(1)
});

export const createBomSchema = accessTokenSchema.extend({
  material_id: z.string().min(1),
  description: z.string().min(1).optional(),
  quantity: z.number().int().positive().default(1)
});

export const updateBomSchema = accessTokenSchema.extend({
  bom_code: z.string().min(1),
  material_id: z.string().min(1).optional(),
  description: z.string().optional(),
  quantity: z.number().int().positive().default(1).optional(),
  status: z.string().min(1).optional()
});

export const deleteBomSchema = accessTokenSchema.extend({
  bom_code: z.string().min(1)
});

export const createProductSchema = accessTokenSchema.extend({
  product_code: z.string().min(1),
  description: z.string().min(1),
  quantity: z.number().int().positive().default(1),
  siteCode: z.string().min(1)
});

export const updateProductSchema = accessTokenSchema.extend({
  product_code: z.string().min(1),
  description: z.string().min(1).optional(),
  quantity: z.number().int().positive().default(1).optional(),
  siteCode: z.string().min(1).optional(),
  status: z.string().min(1).optional()
});

export const deleteProductSchema = accessTokenSchema.extend({
  product_code: z.string().min(1)
});

export const getProductSchema = accessTokenSchema.extend({
  product_code: z.string().min(1)
});
