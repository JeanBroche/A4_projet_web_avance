import { z } from "zod";

const accessTokenSchema = z
  .object({ accessToken: z.string().min(1).optional() })
  .partial();

export const PICKLIST_STATUSES = ["PENDING", "COMPLETED"] as const;
export type PickListStatus = (typeof PICKLIST_STATUSES)[number];

export const SHIPMENT_STATUSES = [
  "PLANNED",
  "PICKED",
  "IN_TRANSIT",
  "DELIVERED",
  "CANCELLED"
] as const;
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

const shipmentStatusSchema = z.enum(SHIPMENT_STATUSES);

const pickListLineInputSchema = z.object({
  lineNumber: z.number().int().positive().optional(),
  productCode: z.string().min(1),
  quantity: z.number().int().positive()
});

const pickListLineCompleteSchema = z.object({
  id: z.string().min(1),
  pickedQty: z.number().int().nonnegative()
});

export const pickListCreateSchema = accessTokenSchema.extend({
  orderNumber: z.string().min(1),
  siteCode: z.string().min(1),
  ofId: z.string().min(1).optional(),
  clientCode: z.string().min(1).optional(),
  lines: z.array(pickListLineInputSchema).min(1)
});

export const pickListByIdSchema = accessTokenSchema.extend({
  id: z.string().min(1)
});

export const pickListCompleteSchema = accessTokenSchema.extend({
  id: z.string().min(1),
  lines: z.array(pickListLineCompleteSchema).optional()
});

export const shipmentPlanSchema = accessTokenSchema.extend({
  pickListId: z.string().min(1),
  carrier: z.string().min(1).optional(),
  plannedShipDate: z.coerce.date().optional(),
  code: z.string().min(1).optional()
});

export const shipmentByIdSchema = accessTokenSchema.extend({
  id: z.string().min(1)
});

export const shipmentUpdateStatusSchema = accessTokenSchema.extend({
  id: z.string().min(1),
  status: shipmentStatusSchema,
  notes: z.string().min(1).optional()
});

export const shipmentHistorySchema = accessTokenSchema.extend({
  siteCode: z.string().min(1).optional(),
  clientCode: z.string().min(1).optional(),
  orderNumber: z.string().min(1).optional(),
  ofId: z.string().min(1).optional(),
  status: shipmentStatusSchema.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().max(100).optional()
});
