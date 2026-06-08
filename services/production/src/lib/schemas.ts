import { z } from "zod";

const accessTokenSchema = z
  .object({ accessToken: z.string().min(1).optional() })
  .partial();

export const anomalyLineSchema = z.object({
  anomaly_code: z.string().min(1),
  description: z.string().min(1),
  status: z.string().min(1),
  batch_id: z.string().min(1),
});

export const getBatchSchema = accessTokenSchema.extend({
  batch_code: z.string().min(1),
});

export const createBatchSchema = accessTokenSchema.extend({
  batch_code: z.string().min(1),
  bom_code: z.string().min(1),
  command_id: z.string().min(1),
});

export const updateBatchSchema = accessTokenSchema.extend({
  batch_code: z.string().min(1),
  bom_code: z.string().min(1).optional(),
  status: z.string().min(1).optional(),
});

export const deleteBatchSchema = accessTokenSchema.extend({
  batch_code: z.string().min(1),
});

export const updateBatchAnomalySchema = accessTokenSchema.extend({
  anomaly: anomalyLineSchema,
  batch_id: z.string().min(1),
});

export const getBomSchema = accessTokenSchema.extend({
  bom_code: z.string().min(1),
});

export const createBomSchema = accessTokenSchema.extend({
  bom_code: z.string().min(1),
  material_id: z.string().min(1),
  description: z.string().min(1).optional(),
  quantity: z.number().int().positive().default(1),
});

export const updateBomSchema = accessTokenSchema.extend({
  bom_code: z.string().min(1),
  material_id: z.string().min(1).optional(),
  description: z.string().optional(),
  quantity: z.number().int().positive().default(1).optional(),
  status: z.string().min(1).optional(),
});

export const deleteBomSchema = accessTokenSchema.extend({
  bom_code: z.string().min(1),
});

export const createProductSchema = accessTokenSchema.extend({
  product_code: z.string().min(1),
  description: z.string().min(1),
  quantity: z.number().int().positive().default(1),
  siteCode: z.string().min(1),
});

export const updateProductSchema = accessTokenSchema.extend({
  product_code: z.string().min(1),
  description: z.string().min(1).optional(),
  quantity: z.number().int().positive().default(1).optional(),
  siteCode: z.string().min(1).optional(),
  status: z.string().min(1).optional(),
});

export const deleteProductSchema = accessTokenSchema.extend({
  product_code: z.string().min(1),
});

export const getProductSchema = accessTokenSchema.extend({
  product_code: z.string().min(1),
});
