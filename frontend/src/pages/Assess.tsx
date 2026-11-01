import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/api.ts'
import { errorMessages } from '../api/client.ts'
import FormField from '../components/FormField.tsx'
import { DOMAINS, type DomainName } from '../domains.ts'
import { validateAssessment, type AssessmentValues, type FieldErrors } from '../validation.ts'



const SUPPORTED_AGES = 'Supported ages: 4.1 to 8.3, 12.0 to 16.0 and 22.5 to 29.3 months.'

function emptyCounts() {
  const counts = {} as AssessmentValues['counts']
  for (const { key } of DOMAINS) counts[key] = { achieved: '', assessed: '' }
  return counts
}

export default function Assess() {
  const navigate = useNavigate()  
  const [childId, setChildId] = useState('')
  const [age, setAge] = useState('')
  const [counts, setCounts] = useState(emptyCounts)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [serverErrors, setServerErrors] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  function setCount(domain: DomainName, field: 'achieved' | 'assessed', value: string) {
    setCounts((current) => ({ ...current, [domain]: { ...current[domain], [field]: value } }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (submitting) return

    const { errors, input } = validateAssessment({ child_id: childId, age_months: age, counts })
    setFieldErrors(errors)
    setServerErrors([])
    const first = Object.keys(errors)[0]
    if (first || !input) {
      document.getElementById(first === 'domains' ? 'cognitive_achieved' : first)?.focus()
      return
    }

    setSubmitting(true)
    try {
      const result = await api.score(input)
      navigate('/assess/result', { state: { result } })
    } catch (error) {
      setServerErrors(errorMessages(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <h1 className="text-2xl font-semibold">New assessment</h1>
      {serverErrors.length > 0 && (
        <div role="alert" className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
          {serverErrors.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <FormField
          id="child_id"
          label="Child ID"
          hint="A code you use for the child. Use the same ID to add a later assessment for the same child."
          value={childId}
          onChange={setChildId}
          error={fieldErrors.child_id}
        />
        <FormField
          id="age_months"
          label="Age in months"
          inputMode="decimal"
          hint={SUPPORTED_AGES}
          value={age}
          onChange={setAge}
          error={fieldErrors.age_months}
        />

        <div className="flex flex-col gap-3">
          <div>
            <h2 className="font-medium">Milestones by domain</h2>
            <p className="text-sm text-slate-600">
              For each domain, enter how many milestones were achieved out of how many were assessed. Leave a domain
              empty if it was not assessed. A domain with fewer than 3 assessed milestones is not scored.
            </p>
            {fieldErrors.domains && (
              <p id="domains-error" className="mt-1 text-sm text-red-700">
                {fieldErrors.domains}
              </p>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {DOMAINS.map(({ key, label }) => (
              <fieldset key={key} className="flex flex-col gap-3 rounded border border-slate-200 p-3">
                <legend className="px-1 text-sm font-medium">{label}</legend>
                <FormField
                  id={`${key}_achieved`}
                  label={`${label} achieved`}
                  inputMode="numeric"
                  value={counts[key].achieved}
                  onChange={(value) => setCount(key, 'achieved', value)}
                  error={fieldErrors[`${key}_achieved`]}
                />
                <FormField
                  id={`${key}_assessed`}
                  label={`${label} assessed`}
                  inputMode="numeric"
                  value={counts[key].assessed}
                  onChange={(value) => setCount(key, 'assessed', value)}
                  error={fieldErrors[`${key}_assessed`]}
                />
              </fieldset>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-fit rounded bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:opacity-60"
        >
          {submitting ? 'Saving...' : 'Submit assessment'}
        </button>
      </form>
    </div>
  )
}