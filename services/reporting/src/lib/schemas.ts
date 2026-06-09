import { z } from "zod";

const accessTokenSchema = z
  .object({ accessToken: z.string().min(1).optional() })
  .partial();

const siteCodeSchema = accessTokenSchema.extend({
  siteCode: z.string().min(1).optional()
});

const windowedSchema = siteCodeSchema.extend({
  windowDays: z.number().int().positive().max(365).optional()
});

export const baseKpiSchema = siteCodeSchema;
export const windowedKpiSchema = windowedSchema;

export type BaseKpiParams = z.infer<typeof baseKpiSchema>;
export type WindowedKpiParams = z.infer<typeof windowedKpiSchema>;
