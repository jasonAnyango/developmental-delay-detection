import type { Assessment } from '../api/api.ts'
import { DOMAINS } from '../domains.ts'
import { isFlagged } from '../flags.ts'
import { percent, zText } from '../format.ts'

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
          {forest
            ? `${forest.flag ? 'flagged' : 'not flagged'} (score ${forest.score})`
            : 'not available for a partial assessment'}
        </p>
        <p data-testid="rules">
          Rule-based (any domain more than 2 standard deviations below the group): {rules.flag ? 'flagged' : 'not flagged'}
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
                const z = assessment.z_scores[key]
                const status =
                  z === null ? 'Not scored' : rules.flagged_domains.includes(key) ? 'Below expected' : 'Within range'
                return (
                  <tr key={key} className="border-b border-slate-200">
                    <th scope="row" className="py-2 pr-4 font-normal">
                      {label}
                    </th>
                    <td className="py-2 pr-4">{percent(assessment.proportions[key])}</td>
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
    </div>
  )
}