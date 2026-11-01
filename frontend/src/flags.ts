import type { Assessment } from './api/api.ts'
import { DOMAIN_LABELS } from './domains.ts'

type Flaggable = {
  rule_based: { flag: boolean }
  isolation_forest: { flag: boolean } | null
}

export function isFlagged(assessment: Flaggable) {
  return assessment.rule_based.flag || assessment.isolation_forest?.flag === true
}

export function flaggedInText(assessment: Assessment) {
  if (!isFlagged(assessment)) return '-'
  const domains = assessment.rule_based.flagged_domains
  if (domains.length === 0) return 'Unusual overall pattern'
  return domains.map((domain) => DOMAIN_LABELS[domain]).join(', ')
}