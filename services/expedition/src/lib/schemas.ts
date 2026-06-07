import { z } from "zod";

const accessTokenSchema = z
  .object({ accessToken: z.string().min(1).optional() })
  .partial();

export const EXPEDITION_STATUSES = [
  "pending",
  "in_progress",
  "completed",
  "cancelled"
] as const;

export type ExpeditionStatus = (typeof EXPEDITION_STATUSES)[number];

const expeditionStatusSchema = z.enum(EXPEDITION_STATUSES);

export const expeditionListSchema = accessTokenSchema.extend({
  siteCode: z.string().min(1).optional(),
  status: expeditionStatusSchema.optional(),
  shippedAt: z.coerce.date().optional(),
  code: z.string().min(1).optional()
});

export const expeditionCreateSchema = accessTokenSchema.extend({
  code: z.string().min(1),
  orderNumber: z.string().min(1),
  expectedDeliveryDate: z.coerce.date(),
  siteCode: z.string().min(1)
});

export const expeditionUpdateSchema = accessTokenSchema.extend({
  id: z.string().min(1),
  code: z.string().min(1).optional(),
  orderNumber: z.string().min(1).optional(),
  expectedDeliveryDate: z.coerce.date().optional(),
  shippedAt: z.coerce.date().optional(),
  siteCode: z.string().min(1).optional(),
  status: expeditionStatusSchema.optional()
});

export const expeditionByIdSchema = accessTokenSchema.extend({
  id: z.string().min(1)
});
