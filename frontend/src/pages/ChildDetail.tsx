import { Link, useParams } from 'react-router-dom'
import AssessmentSummary from '../components/AssessmentSummary.tsx'
import LoadError from '../components/LoadError.tsx'
import { DOMAINS } from '../domains.ts'
import { flaggedInText, isFlagged } from '../flags.ts'
import { formatDate, formatDateTime, zText } from '../format.ts'
import { useChild } from '../hooks/useChild.ts'

function BackLink() {
  return (
    <Link to="/children" className="w-fit text-sm text-blue-700 underline">
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
  if (child === null) return <p className="text-slate-600">Loading...</p>

  const latest = child.assessments.at(-1)
  const history = [...child.assessments].reverse()

  return (
    <div className="flex max-w-3xl flex-col gap-6">
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
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-300">
                <th scope="col" className="py-2 pr-4 font-medium">
                  Date
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Age (months)
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Status
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Flagged in
                </th>
                {DOMAINS.map(({ key, label }) => (
                  <th key={key} scope="col" className="py-2 pr-4 font-medium">
                    {label} z
                  </th>
                ))}
                <th scope="col" className="py-2 font-medium">
                  Forest score
                </th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => (
                <tr key={item.assessment_id} className="border-b border-slate-200" data-testid="history-row">
                  <td className="py-2 pr-4">{formatDateTime(item.assessed_at)}</td>
                  <td className="py-2 pr-4">{item.age_months}</td>
                  <td className="py-2 pr-4">{isFlagged(item) ? 'Flagged' : 'Not flagged'}</td>
                  <td className="py-2 pr-4">{flaggedInText(item)}</td>
                  {DOMAINS.map(({ key }) => (
                    <td key={key} className="py-2 pr-4">
                      {zText(item.z_scores[key])}
                    </td>
                  ))}
                  <td className="py-2">{item.isolation_forest ? item.isolation_forest.score : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-600">Newest first. Z-scores are compared with the reference group for the age at each assessment.</p>
      </section>

      <Link
        to={`/assess?child=${encodeURIComponent(child.child_id)}`}
        className="w-fit rounded bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800"
      >
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