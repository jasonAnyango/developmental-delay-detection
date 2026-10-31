import { request } from './client.ts'

export type Health = { status: string }
export type DatabaseHealth = { database: string }

export type Doctor = { id: number; email: string; full_name: string }
export type LoginResponse = { token: string; expires_in: number; doctor: Doctor }

export type RegisterInput = { email: string; password: string; full_name: string }
export type LoginInput = { email: string; password: string }

export const api = {
  health: () => request<Health>('/health'),
  databaseHealth: () => request<DatabaseHealth>('/health/db'),
  register: (input: RegisterInput) => request<Doctor>('/auth/register', { method: 'POST', body: input }),
  login: (input: LoginInput) => request<LoginResponse>('/auth/login', { method: 'POST', body: input }),
}