import { Errors } from "moleculer";
import type { ZodError } from "zod";

const { MoleculerClientError } = Errors;

export const ErrorCodes = {
  VALIDATION_ERROR: { status: 422, message: "Validation failed" },
  INVALID_CREDENTIALS: { status: 401, message: "Invalid email or password" },
  TOKEN_INVALID: { status: 401, message: "Token is invalid" },
  TOKEN_EXPIRED: { status: 401, message: "Token has expired" },
  FORBIDDEN: { status: 403, message: "Insufficient permissions" },
  USER_INACTIVE: { status: 403, message: "User account is inactive" },
  NOT_FOUND: { status: 404, message: "Resource not found" },
  CONFLICT: { status: 409, message: "Resource already exists" },
  INSUFFICIENT_STOCK: { status: 422, message: "Insufficient stock available" },
  RESERVATION_INACTIVE: { status: 409, message: "Reservation is not active" },
  INVALID_STATUS_TRANSITION: { status: 409, message: "Invalid order status transition" },
  ORDER_NOT_EDITABLE: { status: 409, message: "Order cannot be edited in its current status" }
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
  if (error && typeof error === "object" && "name" in error && error.name === "ZodError") {
    throw validationError(error as ZodError);
  }
  throw error;
}