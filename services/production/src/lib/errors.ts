import { Errors } from "moleculer";
import { ZodError } from "zod";

const { MoleculerClientError } = Errors;

export const ErrorCodes = {
  VALIDATION_ERROR: { status: 422, message: "Validation failed" },
  TOKEN_INVALID: { status: 401, message: "Token is invalid" },
  TOKEN_EXPIRED: { status: 401, message: "Token has expired" },
  FORBIDDEN: { status: 403, message: "Insufficient permissions" },
  NOT_FOUND: { status: 404, message: "Resource not found" },
  CONFLICT: { status: 409, message: "Resource already exists" },
  INSUFFICIENT_STOCK: { status: 422, message: "Insufficient stock available" },
  INVALID_STATUS_TRANSITION: { status: 409, message: "Invalid order status transition" }
} as const;

export type ErrorCode = keyof typeof ErrorCodes;

export function createError(code: ErrorCode, message?: string, details?: unknown) {
  const def = ErrorCodes[code];
  const payload = {
    error: {
      code,
      message: message || def.message,
      ...(details !== undefined ? { details } : {})
    }
  };

  return new MoleculerClientError(
    payload.error.message,
    def.status,
    code,
    payload
  );
}

export function validationError(zodError: ZodError) {
  return createError("VALIDATION_ERROR", ErrorCodes.VALIDATION_ERROR.message, zodError.flatten());
}

export function parseOrThrow(error: unknown): never {
  if (error instanceof ZodError) {
    throw validationError(error);
  }
  throw error;
}
