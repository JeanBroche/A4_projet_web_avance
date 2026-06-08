import { ZodType } from "zod";

import { parseOrThrow } from "./errorUtils.js";

export function parseParams<T>(schema: ZodType<T>, raw: unknown): T {
  try {
    return schema.parse(raw);
  } catch (error) {
    parseOrThrow(error);
  }
}

export function resolveSiteCode(params: { siteCode?: string; siteId?: string }) {
  return params.siteCode || params.siteId || null;
}