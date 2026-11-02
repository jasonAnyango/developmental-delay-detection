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

export type Assessment = {
  assessment_id: number
  assessed_at: string
  age_months: number
  age_band: [number, number]
  complete: boolean
  counts: Record<DomainName, DomainCounts | null>
  proportions: Record<DomainName, number | null>
  z_scores: Record<DomainName, number | null>
  missing_domains: DomainName[]
  isolation_forest: { flag: boolean; score: number } | null
  rule_based: { flag: boolean; score: number; flagged_domains: DomainName[] }
}
export type ChildSummary = {
  id: number
  child_id: string
  created_at: string
  assessment_count: number
  latest: Assessment | null
}
export type ChildrenResponse = { children: ChildSummary[] }
export type ChildHistory = {
  id: number
  child_id: string
  created_at: string
  assessment_count: number
  assessments: Assessment[]
}

export type ScoreSummary = { mean: number; std: number; min: number; median: number; max: number }
export type FlagCount = { flagged: number; rate: number }
export type FoldSummary = {
  flag_rate_per_fold: number[]
  mean_agreement: number
  lowest_agreement: number
  flagged_in_any_fold: number
  flagged_in_all_folds: number
}
export type Evaluation = {
  settings: { n_estimators: number; contamination: number; features: string[] }
  test_set: { rows: number; isolation_forest: FlagCount; rule_based: FlagCount }
  overlap: {
    both: number
    isolation_forest_only: number
    rule_based_only: number
    neither: number
    jaccard: number
  }
  score_distribution: {
    train: ScoreSummary
    test: ScoreSummary
    ks_statistic: number
    ks_p_value: number
    flag_threshold: number
    test_histogram: { edges: number[]; counts: number[] }
  }
  rule_flags_by_domain: Record<DomainName, number>
  by_age_band: { age_band: string; rows: number; if_flagged: number; rule_flagged: number }[]
  fold_consistency: { isolation_forest: FoldSummary; rule_based: FoldSummary }
  notes: string[]
}

export const api = {
  health: () => request<Health>('/health'),
  databaseHealth: () => request<DatabaseHealth>('/health/db'),
  register: (input: RegisterInput) => request<Doctor>('/auth/register', { method: 'POST', body: input }),
  login: (input: LoginInput) => request<LoginResponse>('/auth/login', { method: 'POST', body: input }),
  children: () => request<ChildrenResponse>('/children'),
  evaluation: () => request<Evaluation>('/evaluation'),
  child: (id: number) => request<ChildHistory>(`/children/${id}`),
  score: (input: ScoreInput) => request<ScoreResult>('/score', { method: 'POST', body: input }),
}