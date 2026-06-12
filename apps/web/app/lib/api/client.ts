import { useRuntimeConfig } from '#app'
import { $fetch } from 'ofetch'
import { ApiClientError, unwrapEnvelope } from './envelope'
import type { RequestOptions } from './types'

const AUTH_RETRY_CODES = new Set(['TOKEN_INVALID', 'TOKEN_EXPIRED'])

/** Avoid parallel refresh calls invalidating the rotated refresh token. */
let refreshInFlight: Promise<void> | null = null

function generateCorrelationId(): string {
  return crypto.randomUUID()
}

function extractApiClientError(error: unknown): ApiClientError | null {
  if (error instanceof ApiClientError) {
    return error
  }
  if (error && typeof error === 'object' && 'data' in error) {
    const data = (error as { data: unknown }).data
    if (data && typeof data === 'object' && 'error' in data) {
      const err = (data as { error: { code: string, message: string } }).error
      return new ApiClientError(err.code, err.message)
    }
  }
  return null
}

function shouldRetryAuth(path: string, code: string): boolean {
  if (!AUTH_RETRY_CODES.has(code)) return false
  return !path.startsWith('/auth/login')
    && !path.startsWith('/auth/refresh')
    && !path.startsWith('/auth/logout')
}

export function useApiClient() {
  const config = useRuntimeConfig()

  async function refreshAuthCookies(): Promise<void> {
    if (refreshInFlight) {
      return refreshInFlight
    }

    refreshInFlight = $fetch(`${config.public.apiBase}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-Id': generateCorrelationId()
      },
      credentials: 'include'
    })
      .then(() => undefined)
      .finally(() => {
        refreshInFlight = null
      })

    return refreshInFlight
  }

  async function request<T>(
    path: string,
    options: RequestOptions = {},
    retried = false
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Correlation-Id': generateCorrelationId()
    }

    if (options.accessToken) {
      headers.Authorization = `Bearer ${options.accessToken}`
    }

    try {
      const response = await $fetch<unknown>(`${config.public.apiBase}${path}`, {
        method: options.method ?? 'GET',
        headers,
        body: options.body as Record<string, unknown> | undefined,
        params: options.params,
        credentials: 'include'
      })
      return unwrapEnvelope<T>(response)
    } catch (error: unknown) {
      const apiError = extractApiClientError(error)
      if (apiError) {
        if (!retried && shouldRetryAuth(path, apiError.code)) {
          try {
            await refreshAuthCookies()
            return request<T>(path, options, true)
          } catch {
            // refresh failed — surface original auth error
          }
        }
        throw apiError
      }
      throw error
    }
  }

  return { request }
}

export async function simulateDelay(ms = 300): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms))
}
