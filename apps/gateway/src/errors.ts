import { Errors } from "moleculer";
import { failureResponse, isFailureEnvelope } from "@aeronexis/services-shared";

const { MoleculerClientError } = Errors;

const STATUS_BY_CODE: Record<string, number> = {
  TOKEN_INVALID: 401,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 422,
  INSUFFICIENT_STOCK: 409,
  CONFLICT: 409
};

export function httpStatusFromError(err: Error & { code?: string | number; type?: string }): number {
  if (err instanceof MoleculerClientError) {
    const code = String(err.code ?? err.type ?? "");
    if (STATUS_BY_CODE[code]) return STATUS_BY_CODE[code]!;
    if (typeof err.code === "number" && err.code >= 400 && err.code < 600) return err.code;
  }
  const code = String(err.code ?? "");
  if (STATUS_BY_CODE[code]) return STATUS_BY_CODE[code]!;
  return 500;
}

export function formatHttpError(
  err: Error & { code?: string | number; data?: unknown },
  correlationId?: string
) {
  const meta = correlationId ? { correlationId } : undefined;

  if (err instanceof MoleculerClientError) {
    const data = err.data;
    if (isFailureEnvelope(data)) {
      return { status: httpStatusFromError(err), body: data };
    }
    return {
      status: httpStatusFromError(err),
      body: failureResponse(
        {
          code: String(err.code ?? err.type ?? "UNKNOWN_ERROR"),
          message: err.message
        },
        meta
      )
    };
  }

  return {
    status: 500,
    body: failureResponse(
      {
        code: "INTERNAL_ERROR",
        message: err.message || "Unexpected error"
      },
      meta
    )
  };
}
