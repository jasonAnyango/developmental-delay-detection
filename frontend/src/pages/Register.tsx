import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/api.ts'
import { ApiError } from '../api/client.ts'
import AuthCard from '../components/AuthCard.tsx'
import FormField from '../components/FormField.tsx'
import { cleanEmail, validateRegistration, type FieldErrors } from '../validation.ts'

export default function Register() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [serverErrors, setServerErrors] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (submitting) return

    const found = validateRegistration({ full_name: fullName, email, password, confirm })
    setFieldErrors(found)
    setServerErrors([])
    const first = Object.keys(found)[0]
    if (first) {
      document.getElementById(first)?.focus()
      return
    }

    setSubmitting(true)
    try {
      const doctor = await api.register({ full_name: fullName.trim(), email: cleanEmail(email), password })
      navigate('/login', { state: { registered: true, email: doctor.email } })
    } catch (error) {
      setServerErrors(error instanceof ApiError ? error.messages : ['Something went wrong. Please try again.'])
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthCard title="Create an account" errors={serverErrors}>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <FormField
          id="full_name"
          label="Full name"
          autoComplete="name"
          value={fullName}
          onChange={setFullName}
          error={fieldErrors.full_name}
        />
        <FormField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={setEmail}
          error={fieldErrors.email}
        />
        <FormField
          id="password"
          label="Password (at least 8 characters)"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
          error={fieldErrors.password}
        />
        <FormField
          id="confirm"
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={setConfirm}
          error={fieldErrors.confirm}
        />
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:opacity-60"
        >
          {submitting ? 'Creating account...' : 'Create account'}
        </button>
      </form>
      <p className="text-sm text-slate-600">
        Already have an account?{' '}
        <Link to="/login" className="text-blue-700 underline">
          Sign in
        </Link>
      </p>
    </AuthCard>
  )
}