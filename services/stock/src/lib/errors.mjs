import { Errors } from "moleculer";

const { MoleculerClientError } = Errors;

export const ErrorCodes = {
  VALIDATION_ERROR: { status: 422, message: "Validation failed" },
  TOKEN_INVALID: { status: 401, message: "Token is invalid" },
  TOKEN_EXPIRED: { status: 401, message: "Token has expired" },
  FORBIDDEN: { status: 403, message: "Insufficient permissions" },
  NOT_FOUND: { status: 404, message: "Resource not found" },
  CONFLICT: { status: 409, message: "Resource already exists" },
  INSUFFICIENT_STOCK: { status: 422, message: "Insufficient stock available" },
  RESERVATION_INACTIVE: { status: 409, message: "Reservation is not active" }
};

/**
 * @param {keyof typeof ErrorCodes} code
 * @param {string} [message]
 * @param {unknown} [details]
 */
export function createError(code, message, details) {
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

/**
 * @param {import("zod").ZodError} zodError
 */
export function validationError(zodError) {
  return createError("VALIDATION_ERROR", ErrorCodes.VALIDATION_ERROR.message, zodError.flatten());
}

/**
 * @param {unknown} error
 */
export function parseOrThrow(error) {
  if (error?.name === "ZodError") {
    throw validationError(error);
  }
  throw error;
}
