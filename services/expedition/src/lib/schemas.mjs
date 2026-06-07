import { z } from "zod";

export const STATUS_CODE = [
    "pending",
    "in_progress",
    "completed",
    "cancelled"
]

const statusCodeSchema = z
    .array(z.enum(STATUS_CODE))
    .min(1, "At least one status is required");

export const expeditionListSchema = z.object({
    siteCode: z.string().min(1).optional(),
    status: z.enum(STATUS_CODE).optional(),
    shippedAt: z.string().optional(),
    code: z.string().min(1).optional(),
}).strict();

export const expeditionCreateSchema = z.object({
    code: z.string().min(1),
    orderNumber: z.string().min(1),
    expectedDeliveryDate: z.string().min(1),
    siteCode: z.string().min(1),
    status: z.enum(STATUS_CODE)
});

export const expeditionUpdateSchema = z.object({
    id: z.string().min(1),
    code: z.string().min(1).optional(),
    orderNumber: z.string().min(1).optional(),
    expectedDeliveryDate: z.string().min(1).optional(),
    shippedAt: z.string().min(1).optional(),
    siteCode: z.string().min(1).optional(),
    status: z.enum(STATUS_CODE).optional()
});