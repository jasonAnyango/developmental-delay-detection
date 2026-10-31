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