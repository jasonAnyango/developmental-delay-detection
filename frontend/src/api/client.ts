const BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api').replace(/\/$/, '')

export class ApiError extends Error {
  status: number
  messages: string[]

  constructor(status: number, messages: string[]) {
    super(messages.join(' '))
    this.status = status
    this.messages = messages
  }
}

let authToken: string | null = null
let onUnauthorized: (() => void) | null = null

export function setAuthToken(token: string | null) {
  authToken = token
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler
}

type RequestOptions = {
  method?: string
  body?: unknown
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {}
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`
  }

  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })
  } catch {
    throw new ApiError(0, ['Cannot reach the server. Check your connection and try again.'])
  }

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    if (response.status === 401 && authToken) {
      onUnauthorized?.()
    }
    const messages =
      data && Array.isArray(data.errors) ? (data.errors as string[]) : [`Request failed (${response.status})`]
    throw new ApiError(response.status, messages)
  }

  return data as T
}

export function errorMessages(error: unknown): string[] {
  if (error instanceof ApiError) {
    return error.messages
  }
  return ['Something went wrong. Please try again.']
}