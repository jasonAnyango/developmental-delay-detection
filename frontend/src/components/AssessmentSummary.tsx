import type { Assessment } from '../api/api.ts'
import { DOMAINS } from '../domains.ts'
import { isFlagged } from '../flags.ts'
import { percent, zText } from '../format.ts'
import ZScale from './ZScale.tsx'

type Props = {
  assessment: Pick<Assessment, 'isolation_forest' | 'rule_based' | 'proportions' | 'z_scores'>
}

export default function AssessmentSummary({ assessment }: Props) {
  const flagged = isFlagged(assessment)
  const { isolation_forest: forest, rule_based: rules } = assessment

  return (
    <div className="flex flex-col gap-5">
      <div
        data-testid="verdict"
        className={`flex gap-3 rounded-lg border border-l-4 bg-white p-4 ${
          flagged ? 'border-amber-300 border-l-amber-600' : 'border-slate-200 border-l-brand-700'
        }`}
      >
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
            flagged ? 'bg-amber-100 text-amber-900' : 'bg-brand-50 text-brand-800'
          }`}
        >
          <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
            {flagged ? (
              <path d="M3 14V2.5M3 3h8.5l-2 3 2 3H3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <path d="M3.5 8.5l3 3 6-6.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            )}
          </svg>
        </div>
        <div>
          <p className="text-lg font-semibold">{flagged ? 'Flagged for follow-up' : 'Not flagged'}</p>
          <p className="max-w-prose text-slate-700">
            {flagged
              ? 'This pattern differs from the reference group. A full assessment by a qualified professional is suggested.'
              : 'No unusual pattern was found. This does not rule out a delay.'}
          </p>
        </div>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Methods</h2>
        <div className="panel divide-y divide-slate-100 text-sm">
          <p data-testid="forest" className="px-4 py-3">
            Isolation Forest:{' '}
            {forest
              ? `${forest.flag ? 'flagged' : 'not flagged'} (score ${forest.score})`
              : 'not available for a partial assessment'}
          </p>
          <p data-testid="rules" className="px-4 py-3">
            Rule-based (any domain more than 2 standard deviations below the group): {rules.flag ? 'flagged' : 'not flagged'}
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Domains</h2>
        <div className="panel overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Domain</th>
                <th scope="col">Achieved</th>
                <th scope="col">Z-score</th>
                <th scope="col">Against the reference group</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {DOMAINS.map(({ key, label }) => {
                const z = assessment.z_scores[key]
                const below = rules.flagged_domains.includes(key)
                const status = z === null ? 'Not scored' : below ? 'Below expected' : 'Within range'
                return (
                  <tr key={key}>
                    <th scope="row">{label}</th>
                    <td>{percent(assessment.proportions[key])}</td>
                    <td className="tabular-nums">{zText(z)}</td>
                    <td>
                      <ZScale z={z} />
                    </td>
                    <td
                      data-testid={`status-${key}`}
                      className={below ? 'font-medium text-amber-900' : z === null ? 'text-slate-500' : ''}
                    >
                      {status}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="max-w-prose text-xs text-slate-600">
          The marker shows where the child sits against the reference group for their age. The short grey tick is the
          group average and the amber line is 2 standard deviations below it. The scale runs from -4 to +3.
        </p>
      </section>
    </div>
  )
}