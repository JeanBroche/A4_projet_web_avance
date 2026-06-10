import { Errors } from "moleculer";
import type { ZodError } from "zod";

const { MoleculerClientError } = Errors;

export const ErrorCodes = {
  VALIDATION_ERROR: { status: 422, message: "Validation failed" },
  TOKEN_INVALID: { status: 401, message: "Token is invalid" },
  TOKEN_EXPIRED: { status: 401, message: "Token has expired" },
  FORBIDDEN: { status: 403, message: "Insufficient permissions" },
  NOT_FOUND: { status: 404, message: "Resource not found" },
  CONFLICT: { status: 409, message: "Resource already exists" },
  PICKLIST_NOT_FOUND: { status: 404, message: "Pick list not found" },
  SHIPMENT_NOT_FOUND: { status: 404, message: "Shipment not found" },
  PICKLIST_ALREADY_COMPLETED: { status: 409, message: "Pick list is already completed" },
  PICKLIST_NOT_COMPLETED: { status: 409, message: "Pick list must be completed before planning shipment" },
  SHIPMENT_ALREADY_EXISTS: { status: 409, message: "Shipment already exists for this pick list" },
  INVALID_STATUS_TRANSITION: { status: 409, message: "Invalid shipment status transition" },
  STOCK_RESERVATION_MISSING: { status: 409, message: "No active stock reservation found for this order" }
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
