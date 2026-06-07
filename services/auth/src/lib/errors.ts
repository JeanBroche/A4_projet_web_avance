import { Errors } from "moleculer";
import { ZodError } from "zod";

const { MoleculerClientError } = Errors;

export const ErrorCodes = {
  VALIDATION_ERROR: { status: 422, message: "Validation failed" },
  INVALID_CREDENTIALS: { status: 401, message: "Invalid email or password" },
  TOKEN_EXPIRED: { status: 401, message: "Token has expired" },
  TOKEN_INVALID: { status: 401, message: "Token is invalid" },
  USER_INACTIVE: { status: 403, message: "User account is inactive" },
  FORBIDDEN: { status: 403, message: "Insufficient permissions" },
  NOT_FOUND: { status: 404, message: "Resource not found" },
  CONFLICT: { status: 409, message: "Resource already exists" }
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
