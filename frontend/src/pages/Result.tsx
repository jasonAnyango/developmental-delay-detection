import { Link, Navigate, useLocation } from 'react-router-dom'
import type { ScoreResult } from '../api/api.ts'
import AssessmentSummary from '../components/AssessmentSummary.tsx'

export default function Result() {
  const location = useLocation()
  const result = location.state?.result as ScoreResult | undefined
  if (!result) return <Navigate to="/assess" replace />

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold">Assessment result</h1>
        <p className="text-sm text-slate-600">
          Child {result.child_id}, {result.age_months} months (age group {result.age_band[0]} to {result.age_band[1]}{' '}
          months). Saved as reference {result.assessment_id}.
        </p>
      </div>

      <AssessmentSummary assessment={result} />

      {result.warnings.length > 0 && (
        <section className="rounded border border-slate-300 bg-slate-50 px-3 py-2 text-sm">
          <h2 className="font-medium">Notes</h2>
          <ul className="list-disc pl-5">
            {result.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-xs text-slate-600">
        This is a screening result, not a diagnosis. Use it together with clinical judgement.
      </p>

      <Link to="/assess" className="w-fit rounded bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800">
        New assessment
      </Link>
    </div>
  )
}