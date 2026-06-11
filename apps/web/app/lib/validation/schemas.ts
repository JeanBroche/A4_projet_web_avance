import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().min(1, 'Email requis').email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis')
})

export const createBatchSchema = z.object({
  productName: z.string().trim().min(1, 'Désignation requise'),
  qty: z.coerce.number().int().min(1, 'Quantité minimale : 1'),
  priority: z.enum(['low', 'normal', 'high', 'critical']),
  emoji: z.string().min(1)
})

export const createStockLevelSchema = z.object({
  name: z.string().trim().min(1, 'Désignation requise'),
  reference: z.string().trim().min(1, 'Référence requise'),
  category: z.string().default(''),
  description: z.string().default(''),
  dimensions: z.string().default(''),
  qty: z.coerce.number().int().min(0),
  unit: z.enum(['pcs', 'mm', 'cm', 'm', 'kg', 'g', 'ml', 'l']),
  minQty: z.coerce.number().int().min(0)
})

export const createReservationLineSchema = z.object({
  materialId: z.string().trim().min(1, 'Référence matière requise'),
  qty: z.coerce.number().positive('Quantité positive requise')
})

export const createReservationSchema = z.object({
  ofId: z.string().trim().min(1, 'OF requis'),
  lines: z.array(createReservationLineSchema).min(1, 'Au moins une ligne à réserver')
}).superRefine((data, ctx) => {
  for (const [i, line] of data.lines.entries()) {
    if (!Number.isFinite(line.qty) || line.qty <= 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'Quantité invalide',
        path: ['lines', i, 'qty']
      })
    }
  }
})

export const createOrderSchema = z.object({
  client: z.string().trim().min(1, 'Client requis'),
  destination: z.string().trim().min(1, 'Destination requise'),
  itemsCount: z.coerce.number().int().min(1, 'Au moins 1 article'),
  weightValue: z.coerce.number().min(1, 'Poids minimal : 1 kg'),
  carrier: z.string().min(1),
  emoji: z.string().min(1)
})

export type LoginForm = z.infer<typeof loginSchema>
export type CreateBatchForm = z.infer<typeof createBatchSchema>
export type CreateStockLevelForm = z.infer<typeof createStockLevelSchema>
export type CreateReservationForm = z.infer<typeof createReservationSchema>
export type CreateOrderForm = z.infer<typeof createOrderSchema>

export function firstZodError(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Données invalides'
}
