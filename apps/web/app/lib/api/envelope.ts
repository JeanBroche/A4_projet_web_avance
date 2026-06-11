import type { ApiErrorPayload, ApiSuccessPayload } from './types'

export function isErrorEnvelope(payload: unknown): payload is ApiErrorPayload {
  return (
    typeof payload === 'object'
    && payload !== null
    && 'error' in payload
    && typeof (payload as ApiErrorPayload).error?.code === 'string'
  )
}

export function isSuccessEnvelope<T>(payload: unknown): payload is ApiSuccessPayload<T> {
  return typeof payload === 'object' && payload !== null && 'data' in payload
}

export function unwrapEnvelope<T>(payload: unknown): T {
  if (isErrorEnvelope(payload)) {
    throw new ApiClientError(payload.error.code, payload.error.message)
  }
  if (isSuccessEnvelope<T>(payload)) {
    return payload.data
  }
  return payload as T
}

export class ApiClientError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message)
    this.name = 'ApiClientError'
  }
}

export function toFailureResult(error: unknown): { status: 'failure', code: string, message: string } {
  if (error instanceof ApiClientError) {
    return { status: 'failure', code: error.code, message: error.message }
  }
  if (error instanceof Error) {
    return { status: 'failure', code: 'UNKNOWN', message: error.message }
  }
  return { status: 'failure', code: 'UNKNOWN', message: 'Une erreur inattendue est survenue' }
}
