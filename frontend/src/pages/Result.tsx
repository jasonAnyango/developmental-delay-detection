import { Link, Navigate, useLocation } from 'react-router-dom'
import type { ScoreResult } from '../api/api.ts'
import { DOMAINS } from '../domains.ts'

function percent(value: number | null) {
  return value === null ? '-' : `${Math.round(value * 100)}%`
}

function zText(value: number | null) {
  return value === null ? '-' : value.toFixed(2)
}

export default function Result() {
  const location = useLocation()
  const result = location.state?.result as ScoreResult | undefined
  if (!result) return <Navigate to="/assess" replace />

  const flagged = result.rule_based.flag || result.isolation_forest?.flag === true

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold">Assessment result</h1>
        <p className="text-sm text-slate-600">
          Child {result.child_id}, {result.age_months} months (age group {result.age_band[0]} to {result.age_band[1]}{' '}
          months). Saved as reference {result.assessment_id}.
        </p>
      </div>

      <div
        data-testid="verdict"
        className={`rounded border px-4 py-3 ${
          flagged ? 'border-amber-400 bg-amber-50 text-amber-950' : 'border-green-300 bg-green-50 text-green-950'
        }`}
      >
        <p className="font-semibold">{flagged ? 'Flagged for follow-up' : 'Not flagged'}</p>
        <p className="text-sm">
          {flagged
            ? 'This pattern differs from the reference group. A full assessment by a qualified professional is suggested.'
            : 'No unusual pattern was found. This does not rule out a delay.'}
        </p>
      </div>

      <section className="flex flex-col gap-1 text-sm">
        <h2 className="font-medium">Methods</h2>
        <p data-testid="forest">
          Isolation Forest:{' '}
          {result.isolation_forest
            ? `${result.isolation_forest.flag ? 'flagged' : 'not flagged'} (score ${result.isolation_forest.score})`
            : 'not available for a partial assessment'}
        </p>
        <p data-testid="rules">
          Rule-based (any domain more than 2 standard deviations below the group):{' '}
          {result.rule_based.flag ? 'flagged' : 'not flagged'}
        </p>
      </section>

      <section>
        <h2 className="mb-1 font-medium">Domains</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-300">
                <th scope="col" className="py-2 pr-4 font-medium">
                  Domain
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Achieved
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Z-score
                </th>
                <th scope="col" className="py-2 font-medium">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {DOMAINS.map(({ key, label }) => {
                const z = result.z_scores[key]
                const status =
                  z === null ? 'Not scored' : result.rule_based.flagged_domains.includes(key) ? 'Below expected' : 'Within range'
                return (
                  <tr key={key} className="border-b border-slate-200">
                    <th scope="row" className="py-2 pr-4 font-normal">
                      {label}
                    </th>
                    <td className="py-2 pr-4">{percent(result.proportions[key])}</td>
                    <td className="py-2 pr-4">{zText(z)}</td>
                    <td className="py-2" data-testid={`status-${key}`}>
                      {status}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

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