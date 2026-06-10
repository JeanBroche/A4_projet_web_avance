import type { ZodType } from "zod";
import { parseOrThrow } from "./errors.js";

export function parseParams<T>(schema: ZodType<T>, raw: unknown): T {
  try {
    return schema.parse(raw);
  } catch (error) {
    parseOrThrow(error);
  }
}
