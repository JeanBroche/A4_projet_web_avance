import { useRuntimeConfig } from '#app'
import { $fetch } from 'ofetch'
import { ApiClientError, unwrapEnvelope } from './envelope'
import type { RequestOptions } from './types'

function generateCorrelationId(): string {
  return crypto.randomUUID()
}

export function useApiClient() {
  const config = useRuntimeConfig()

  async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
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
      if (error && typeof error === 'object' && 'data' in error) {
        const data = (error as { data: unknown }).data
        if (data && typeof data === 'object' && 'error' in data) {
          const err = (data as { error: { code: string, message: string } }).error
          throw new ApiClientError(err.code, err.message)
        }
      }
      throw error
    }
  }

  return { request }
}

export async function simulateDelay(ms = 300): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms))
}
