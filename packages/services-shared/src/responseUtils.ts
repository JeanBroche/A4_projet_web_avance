export type ApiSuccessPayload<T = unknown> = {
  status: "success";
  data: T;
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

/** Extrait `data` si enveloppe présente (tests / gateway). */
export function unwrapResponse<T>(value: T | ApiSuccessPayload<T>): T {
  if (isSuccessEnvelope(value)) {
    return value.data;
  }
  return value as T;
}
