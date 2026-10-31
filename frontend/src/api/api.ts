import { request } from './client.ts'

export type Health = { status: string }
export type DatabaseHealth = { database: string }

export const api = {
  health: () => request<Health>('/health'),
  databaseHealth: () => request<DatabaseHealth>('/health/db'),
}