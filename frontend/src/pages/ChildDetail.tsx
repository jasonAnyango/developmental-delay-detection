import { Link, useParams } from 'react-router-dom'
import AssessmentSummary from '../components/AssessmentSummary.tsx'
import LoadError from '../components/LoadError.tsx'
import Loading from '../components/Loading.tsx'
import StatusBadge from '../components/StatusBadge.tsx'
import { DOMAINS } from '../domains.ts'
import { flaggedInText, isFlagged } from '../flags.ts'
import { formatDate, formatDateTime, zText } from '../format.ts'
import { useChild } from '../hooks/useChild.ts'

function BackLink() {
  return (
    <Link to="/children" className="link w-fit text-sm">
      Back to children
    </Link>
  )
}

function ChildView({ id }: { id: number }) {
  const { child, errors, notFound, retry } = useChild(id)

  if (notFound) {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold">Child not found</h1>
        <p className="text-slate-600">This child does not exist or is not one of yours.</p>
        <BackLink />
      </div>
    )
  }
  if (errors.length > 0) return <LoadError errors={errors} onRetry={retry} />
  if (child === null) return <Loading />

  const latest = child.assessments.at(-1)
  const history = [...child.assessments].reverse()

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <BackLink />
      <div>
        <h1 className="text-2xl font-semibold">Child {child.child_id}</h1>
        <p className="text-sm text-slate-600">
          First recorded {formatDate(child.created_at)}. {child.assessment_count}{' '}
          {child.assessment_count === 1 ? 'assessment' : 'assessments'}.
        </p>
      </div>

      {latest ? (
        <section className="flex flex-col gap-3">
          <div>
            <h2 className="text-lg font-semibold">Latest assessment</h2>
            <p className="text-sm text-slate-600">
              {formatDateTime(latest.assessed_at)}, age {latest.age_months} months (age group {latest.age_band[0]} to{' '}
              {latest.age_band[1]} months).
            </p>
          </div>
          <AssessmentSummary assessment={latest} />
        </section>
      ) : (
        <p className="text-slate-600">No assessments recorded.</p>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">History</h2>
        <div className="panel overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Age (months)</th>
                <th scope="col">Status</th>
                <th scope="col">Flagged in</th>
                {DOMAINS.map(({ key, label }) => (
                  <th key={key} scope="col">
                    {label} z
                  </th>
                ))}
                <th scope="col">Forest score</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => (
                <tr key={item.assessment_id} data-testid="history-row">
                  <td className="whitespace-nowrap">{formatDateTime(item.assessed_at)}</td>
                  <td className="tabular-nums">{item.age_months}</td>
                  <td>
                    <StatusBadge flagged={isFlagged(item)} />
                  </td>
                  <td>{flaggedInText(item)}</td>
                  {DOMAINS.map(({ key }) => (
                    <td key={key} className="tabular-nums">
                      {zText(item.z_scores[key])}
                    </td>
                  ))}
                  <td className="tabular-nums">{item.isolation_forest ? item.isolation_forest.score : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-600">Newest first. Z-scores are compared with the reference group for the age at each assessment.</p>
      </section>

      <Link to={`/assess?child=${encodeURIComponent(child.child_id)}`} className="btn-primary w-fit">
        New assessment for this child
      </Link>
    </div>
  )
}

export default function ChildDetail() {
  const { id } = useParams()
  if (!id || !/^\d+$/.test(id)) {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold">Child not found</h1>
        <BackLink />
      </div>
    )
  }
  return <ChildView key={id} id={Number(id)} />
}