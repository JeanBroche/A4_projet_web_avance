export type AsyncStatus = 'idle' | 'pending' | 'success' | 'failure'

export type ApiResult<T>
  = | { status: 'idle' }
    | { status: 'pending' }
    | { status: 'success', data: T }
    | { status: 'failure', code: string, message: string }

export interface ApiErrorPayload {
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export interface ApiSuccessPayload<T> {
  data: T
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  params?: Record<string, string | number | boolean | undefined>
  accessToken?: string | null
}
