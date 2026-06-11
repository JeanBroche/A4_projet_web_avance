import { z } from "zod";

export const ROLE_CODES = [
  "operateur",
  "logistique",
  "commercial",
  "direction",
  "admin"
] as const;

const roleCodesSchema = z
  .array(z.enum(ROLE_CODES))
  .min(1, "At least one role is required");

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1)
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1)
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(1),
  accessToken: z.string().min(1).optional()
});

export const meSchema = z.object({
  accessToken: z.string().min(1).optional()
});

export const accessTokenSchema = z.object({
  accessToken: z.string().min(1)
});

export const userListSchema = accessTokenSchema.extend({
  email: z.email().optional(),
  isActive: z.boolean().optional()
});

export const userCreateSchema = accessTokenSchema.extend({
  email: z.email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  siteId: z.string().optional(),
  roleCodes: roleCodesSchema
});

export const userUpdateSchema = accessTokenSchema.extend({
  id: z.string().min(1),
  email: z.email().optional(),
  password: z.string().min(8).optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  siteId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  roleCodes: roleCodesSchema.optional()
});
