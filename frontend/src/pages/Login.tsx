import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api/api.ts'
import { ApiError } from '../api/client.ts'
import AuthCard from '../components/AuthCard.tsx'
import FormField from '../components/FormField.tsx'
import { cleanEmail, validateLogin, type FieldErrors } from '../validation.ts'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const registered = location.state?.registered === true

  const [email, setEmail] = useState<string>(location.state?.email ?? '')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [serverErrors, setServerErrors] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (submitting) return

    const found = validateLogin({ email, password })
    setFieldErrors(found)
    setServerErrors([])
    const first = Object.keys(found)[0]
    if (first) {
      document.getElementById(first)?.focus()
      return
    }

    setSubmitting(true)
    try {
      await api.login({ email: cleanEmail(email), password })
      navigate('/')
    } catch (error) {
      setServerErrors(error instanceof ApiError ? error.messages : ['Something went wrong. Please try again.'])
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthCard
      title="Sign in"
      notice={registered ? 'Account created. Sign in to continue.' : undefined}
      errors={serverErrors}
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
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
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
          error={fieldErrors.password}
        />
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:opacity-60"
        >
          {submitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
      <p className="text-sm text-slate-600">
        No account yet?{' '}
        <Link to="/register" className="text-blue-700 underline">
          Create one
        </Link>
      </p>
    </AuthCard>
  )
}