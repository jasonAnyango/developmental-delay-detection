import { request } from './client.ts'
import type { DomainName } from '../domains.ts'

export type Health = { status: string }
export type DatabaseHealth = { database: string }

export type Doctor = { id: number; email: string; full_name: string }
export type LoginResponse = { token: string; expires_in: number; doctor: Doctor }

export type RegisterInput = { email: string; password: string; full_name: string }
export type LoginInput = { email: string; password: string }

export type DomainCounts = { achieved: number; assessed: number }
export type ScoreInput = {
  child_id: string
  age_months: number
  domains: Partial<Record<DomainName, DomainCounts>>
}
export type ScoreResult = {
  assessment_id: number
  child_id: string
  age_months: number
  age_band: [number, number]
  complete: boolean
  proportions: Record<DomainName, number | null>
  z_scores: Record<DomainName, number | null>
  isolation_forest: { flag: boolean; score: number } | null
  rule_based: { flag: boolean; score: number; flagged_domains: DomainName[] }
  warnings: string[]
}

export const api = {
  health: () => request<Health>('/health'),
  databaseHealth: () => request<DatabaseHealth>('/health/db'),
  register: (input: RegisterInput) => request<Doctor>('/auth/register', { method: 'POST', body: input }),
  login: (input: LoginInput) => request<LoginResponse>('/auth/login', { method: 'POST', body: input }),
  score: (input: ScoreInput) => request<ScoreResult>('/score', { method: 'POST', body: input }),
}