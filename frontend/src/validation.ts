import type { DomainCounts, ScoreInput } from './api/api.ts'
import { DOMAINS, type DomainName } from './domains.ts'

export type FieldErrors = Record<string, string>

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
export const MIN_PASSWORD_LENGTH = 8
export const MAX_PASSWORD_LENGTH = 128
export const MAX_NAME_LENGTH = 120

export function cleanEmail(email: string) {
  return email.trim().toLowerCase()
}

function emailError(email: string) {
  const value = cleanEmail(email)
  if (value === '') return 'Enter your email address'
  if (value.length > 255 || !EMAIL_PATTERN.test(value)) return 'Enter a valid email address'
  return ''
}

export function validateLogin(values: { email: string; password: string }) {
  const errors: FieldErrors = {}
  if (cleanEmail(values.email) === '') errors.email = 'Enter your email address'
  if (values.password === '') errors.password = 'Enter your password'
  return errors
}

export function validateRegistration(values: {
  full_name: string
  email: string
  password: string
  confirm: string
}) {
  const errors: FieldErrors = {}

  const name = values.full_name.trim()
  if (name === '') errors.full_name = 'Enter your full name'
  else if (name.length > MAX_NAME_LENGTH) errors.full_name = `Name must be at most ${MAX_NAME_LENGTH} characters`

  const email = emailError(values.email)
  if (email) errors.email = email

  if (values.password === '') errors.password = 'Enter a password'
  else if (values.password.length < MIN_PASSWORD_LENGTH)
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
  else if (values.password.length > MAX_PASSWORD_LENGTH)
    errors.password = `Password must be at most ${MAX_PASSWORD_LENGTH} characters`

  if (values.confirm === '') errors.confirm = 'Confirm your password'
  else if (values.confirm !== values.password) errors.confirm = 'Passwords do not match'

  return errors
}

export const MAX_CHILD_ID_LENGTH = 64
export const MAX_AGE_MONTHS = 36

const WHOLE_NUMBER = /^\d{1,3}$/
const DECIMAL_NUMBER = /^\d+(\.\d+)?$/

export type AssessmentValues = {
  child_id: string
  age_months: string
  counts: Record<DomainName, { achieved: string; assessed: string }>
}

export function validateAssessment(values: AssessmentValues) {
  const errors: FieldErrors = {}

  const childId = values.child_id.trim()
  if (childId === '') errors.child_id = 'Enter the child ID'
  else if (childId.length > MAX_CHILD_ID_LENGTH)
    errors.child_id = `Child ID must be at most ${MAX_CHILD_ID_LENGTH} characters`

  const age = values.age_months.trim()
  let ageValue = 0
  if (age === '') errors.age_months = "Enter the child's age in months"
  else if (!DECIMAL_NUMBER.test(age)) errors.age_months = 'Enter the age as a number, for example 6.5'
  else {
    ageValue = Number(age)
    if (ageValue <= 0 || ageValue > MAX_AGE_MONTHS)
      errors.age_months = `Age must be between 0 and ${MAX_AGE_MONTHS} months`
  }

  const domains: Partial<Record<DomainName, DomainCounts>> = {}
  let domainFieldError = false
  for (const { key } of DOMAINS) {
    const achieved = values.counts[key].achieved.trim()
    const assessed = values.counts[key].assessed.trim()
    if (achieved === '' && assessed === '') continue

    const achievedId = `${key}_achieved`
    const assessedId = `${key}_assessed`
    if (achieved === '') errors[achievedId] = 'Enter how many were achieved'
    else if (!WHOLE_NUMBER.test(achieved)) errors[achievedId] = 'Enter a whole number from 0 to 999'
    if (assessed === '') errors[assessedId] = 'Enter how many were assessed'
    else if (!WHOLE_NUMBER.test(assessed)) errors[assessedId] = 'Enter a whole number from 0 to 999'

    if (!errors[achievedId] && !errors[assessedId]) {
      if (Number(achieved) > Number(assessed)) errors[achievedId] = 'Achieved cannot be more than assessed'
      else domains[key] = { achieved: Number(achieved), assessed: Number(assessed) }
    }
    if (errors[achievedId] || errors[assessedId]) domainFieldError = true
  }
  if (Object.keys(domains).length === 0 && !domainFieldError) {
    errors.domains = 'Enter the milestone counts for at least one domain'
  }

  if (Object.keys(errors).length > 0) return { errors, input: null }
  const input: ScoreInput = { child_id: childId, age_months: ageValue, domains }
  return { errors, input }
}