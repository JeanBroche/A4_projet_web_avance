import { Errors } from "moleculer";
import { ZodError } from "zod";

const { MoleculerClientError } = Errors;

export const ErrorCodes = {
  // Common (auth, RBAC, validation)
  VALIDATION_ERROR: { status: 422, message: "Validation failed" },
  INVALID_CREDENTIALS: { status: 401, message: "Invalid email or password" },
  TOKEN_INVALID: { status: 401, message: "Token is invalid" },
  TOKEN_EXPIRED: { status: 401, message: "Token has expired" },
  FORBIDDEN: { status: 403, message: "Insufficient permissions" },
  USER_INACTIVE: { status: 403, message: "User account is inactive" },
  NOT_FOUND: { status: 404, message: "Resource not found" },
  CONFLICT: { status: 409, message: "Resource already exists" },

  // Order
  ORDER_INVALID_STATUS_TRANSITION: { status: 409, message: "Invalid order status transition" },
  ORDER_NOT_EDITABLE: { status: 409, message: "Order cannot be edited in its current status" },

  // Stock
  INSUFFICIENT_STOCK: { status: 422, message: "Insufficient stock available" },
  RESERVATION_INACTIVE: { status: 409, message: "Reservation is not active" },

  // Production
  PRODUCTION_INVALID_STATUS_TRANSITION: { status: 409, message: "Invalid production status transition" },

  // Shipment
  SHIPMENT_INVALID_STATUS_TRANSITION: { status: 409, message: "Invalid shipment status transition" },
  PICKLIST_NOT_FOUND: { status: 404, message: "Pick list not found" },
  SHIPMENT_NOT_FOUND: { status: 404, message: "Shipment not found" },
  PICKLIST_ALREADY_COMPLETED: { status: 409, message: "Pick list is already completed" },
  PICKLIST_NOT_COMPLETED: { status: 409, message: "Pick list must be completed before planning shipment" },
  SHIPMENT_ALREADY_EXISTS: { status: 409, message: "Shipment already exists for this pick list" },
  STOCK_RESERVATION_MISSING: { status: 409, message: "No active stock reservation found for this order" }
} as const;

export type ErrorCode = keyof typeof ErrorCodes;

export type ApiErrorPayload = {
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
};

export function createError(code: ErrorCode, message?: string, details?: unknown) {
  const def = ErrorCodes[code];
  const payload: ApiErrorPayload = {
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

export function getErrorCode(error: unknown): string | undefined {
  const err = error as { data?: { error?: { code?: string } }; code?: string };
  return err?.data?.error?.code ?? err?.code;
}

export function isAppError(error: unknown): error is InstanceType<typeof MoleculerClientError> {
  return Boolean(getErrorCode(error));
}
