import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api, type Checklist, type ScoreInput } from '../api/api.ts'
import { errorMessages } from '../api/client.ts'
import ChecklistInput from '../components/ChecklistInput.tsx'
import FormField from '../components/FormField.tsx'
import { DOMAINS, type DomainName } from '../domains.ts'
import {
  validateAge,
  validateAssessment,
  validateChildAndAge,
  type AssessmentValues,
  type FieldErrors,
} from '../validation.ts'

const SUPPORTED_AGES = 'Supported ages: 4.1 to 8.3, 12.0 to 16.0 and 22.5 to 29.3 months.'

type Mode = 'checklist' | 'counts'

function emptyCounts() {
  const counts = {} as AssessmentValues['counts']
  for (const { key } of DOMAINS) counts[key] = { achieved: '', assessed: '' }
  return counts
}

function inBand(checklist: Checklist, age: number) {
  return age >= checklist.age_band[0] && age < checklist.age_band[1]
}

export default function Assess() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [mode, setMode] = useState<Mode>('checklist')
  const [childId, setChildId] = useState(params.get('child') ?? '')
  const [age, setAge] = useState('')
  const [counts, setCounts] = useState(emptyCounts)
  const [checklist, setChecklist] = useState<Checklist | null>(null)
  const [answers, setAnswers] = useState<Record<string, boolean>>({})
  const [loadingChecklist, setLoadingChecklist] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [serverErrors, setServerErrors] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  const parsedAge = validateAge(age)
  const stale = checklist !== null && (parsedAge.error !== '' || !inBand(checklist, parsedAge.value))

  function setCount(domain: DomainName, field: 'achieved' | 'assessed', value: string) {
    setCounts((current) => ({ ...current, [domain]: { ...current[domain], [field]: value } }))
  }

  function clearChecklistError() {
    setFieldErrors((current) => {
      if (!current.checklist) return current
      const rest = { ...current }
      delete rest.checklist
      return rest
    })
  }

  function changeAge(value: string) {
    setAge(value)
    clearChecklistError()
  }

  function setAnswer(id: string, value: boolean | null) {
    clearChecklistError()
    setAnswers((current) => {
      const next = { ...current }
      if (value === null) delete next[id]
      else next[id] = value
      return next
    })
  }

  async function showChecklist() {
    const check = validateAge(age)
    if (check.error) {
      setFieldErrors({ age_months: check.error })
      document.getElementById('age_months')?.focus()
      return
    }
    setFieldErrors({})
    setServerErrors([])
    setLoadingChecklist(true)
    try {
      const loaded = await api.checklist(check.value)
      const ids = new Set(loaded.domains.flatMap((domain) => domain.items.map((item) => item.id)))
      setAnswers((current) => Object.fromEntries(Object.entries(current).filter(([id]) => ids.has(id))))
      setChecklist(loaded)
    } catch (error) {
      setFieldErrors({ age_months: errorMessages(error)[0] })
      document.getElementById('age_months')?.focus()
    } finally {
      setLoadingChecklist(false)
    }
  }

  function validateChecklist() {
    const { errors, childId: cleanId, ageValue } = validateChildAndAge(childId, age)
    if (checklist === null) errors.checklist = 'Show the checklist for this age first'
    else if (!errors.age_months && stale) errors.checklist = 'The age changed. Show the checklist again'
    else if (Object.keys(answers).length === 0) errors.checklist = 'Mark at least one item as passed or not passed'
    if (Object.keys(errors).length > 0) return { errors, input: null }
    const input: ScoreInput = { child_id: cleanId, age_months: ageValue, items: answers }
    return { errors, input }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (submitting) return

    const { errors, input } =
      mode === 'checklist' ? validateChecklist() : validateAssessment({ child_id: childId, age_months: age, counts })
    setFieldErrors(errors)
    setServerErrors([])
    const first = Object.keys(errors)[0]
    if (first || !input) {
      const target = first === 'domains' ? 'cognitive_achieved' : first === 'checklist' ? 'show-checklist' : first
      document.getElementById(target)?.focus()
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
    <div className="flex max-w-2xl flex-col gap-5">
      <h1 className="text-2xl font-semibold">New assessment</h1>

      {serverErrors.length > 0 && (
        <div role="alert" className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
          {serverErrors.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
        <div className="panel grid items-start gap-5 p-5 sm:grid-cols-2">
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
            onChange={changeAge}
            error={fieldErrors.age_months}
          />
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Milestones</h2>
            <div className="flex gap-2" role="group" aria-label="How to enter milestones">
              {(
                [
                  { value: 'checklist', label: 'Checklist' },
                  { value: 'counts', label: 'Quick entry' },
                ] as const
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setMode(option.value)}
                  aria-pressed={mode === option.value}
                  className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
                    mode === option.value
                      ? 'border-brand-700 bg-brand-700 text-white'
                      : 'border-slate-300 bg-white text-slate-800 hover:border-brand-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {mode === 'checklist' ? (
            <>
              <p className="max-w-prose text-sm text-slate-600">
                Show the checklist for the child&apos;s age, then mark each milestone you tried as passed or not
                passed. Leave the others as not tried. A domain needs at least 3 tried items to be scored.
              </p>
              {fieldErrors.checklist && (
                <p id="checklist-error" className="text-sm text-red-700">
                  {fieldErrors.checklist}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  id="show-checklist"
                  type="button"
                  onClick={showChecklist}
                  disabled={loadingChecklist}
                  className="btn-secondary"
                >
                  {loadingChecklist ? 'Loading...' : checklist ? 'Show the checklist again' : 'Show checklist'}
                </button>
                {checklist && !stale && (
                  <p className="text-sm text-slate-600" data-testid="checklist-band">
                    Checklist for ages {checklist.age_band[0]} to {checklist.age_band[1]} months.
                  </p>
                )}
                {stale && (
                  <p className="text-sm text-amber-900" role="status">
                    The age no longer matches this checklist. Show the checklist again.
                  </p>
                )}
              </div>
              {checklist && <ChecklistInput checklist={checklist} answers={answers} onAnswer={setAnswer} />}
            </>
          ) : (
            <>
              <p className="max-w-prose text-sm text-slate-600">
                For each domain, enter how many milestones were achieved out of how many were assessed. Leave a domain
                empty if it was not assessed. A domain with fewer than 3 assessed milestones is not scored.
              </p>
              {fieldErrors.domains && (
                <p id="domains-error" className="text-sm text-red-700">
                  {fieldErrors.domains}
                </p>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                {DOMAINS.map(({ key, label }) => (
                  <fieldset key={key} className="panel grid grid-cols-2 items-start gap-3 p-4">
                    <legend className="px-1 font-medium text-brand-800">{label}</legend>
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
            </>
          )}
        </div>

        <button type="submit" disabled={submitting} className="btn-primary w-fit">
          {submitting ? 'Saving...' : 'Submit assessment'}
        </button>
      </form>
    </div>
  )
}