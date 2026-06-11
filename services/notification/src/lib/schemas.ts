import { z } from "zod";

const accessTokenSchema = z
  .object({ accessToken: z.string().min(1).optional() })
  .partial();

export const inboxListSchema = accessTokenSchema.extend({
  siteCode: z.string().min(1).optional(),
  unreadOnly: z.coerce.boolean().optional(),
  limit: z.number().int().positive().max(100).optional()
});

export const inboxMarkReadSchema = accessTokenSchema.extend({
  notificationId: z.string().uuid(),
  siteCode: z.string().min(1).optional()
});
