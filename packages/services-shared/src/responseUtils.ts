export type ApiSuccessPayload<T = unknown> = {
  status: "success";
  data: T;
  meta?: {
    correlationId?: string;
    [key: string]: unknown;
  };
};

export type ApiFailurePayload = {
  status: "failure";
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    correlationId?: string;
    [key: string]: unknown;
  };
};

export function isSuccessEnvelope(value: unknown): value is ApiSuccessPayload {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as ApiSuccessPayload).status === "success" &&
    "data" in value
  );
}

export function isFailureEnvelope(value: unknown): value is ApiFailurePayload {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as ApiFailurePayload).status === "failure" &&
    "error" in value
  );
}

export function isApiEnvelopeEnabled() {
  return process.env.API_SUCCESS_ENVELOPE === "true";
}

/** Enveloppe une réponse action Moleculer. */
export function successResponse<T>(
  data: T,
  meta?: ApiSuccessPayload["meta"]
): ApiSuccessPayload<T> {
  return {
    status: "success",
    data,
    ...(meta ? { meta } : {})
  };
}

export function failureResponse(
  error: ApiFailurePayload["error"],
  meta?: ApiFailurePayload["meta"]
): ApiFailurePayload {
  return {
    status: "failure",
    error,
    ...(meta ? { meta } : {})
  };
}

/** Extrait `data` si enveloppe présente (tests / gateway). */
export function unwrapResponse<T>(value: T | ApiSuccessPayload<T>): T {
  if (isSuccessEnvelope(value)) {
    return value.data;
  }
  return value as T;
}
