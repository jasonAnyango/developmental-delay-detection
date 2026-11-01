type Flaggable = {
  rule_based: { flag: boolean }
  isolation_forest: { flag: boolean } | null
}

export function isFlagged(assessment: Flaggable) {
  return assessment.rule_based.flag || assessment.isolation_forest?.flag === true
}