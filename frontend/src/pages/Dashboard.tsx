import { Link } from 'react-router-dom'
import FlaggedDomainsChart from '../components/FlaggedDomainsChart.tsx'
import LoadError from '../components/LoadError.tsx'
import Loading from '../components/Loading.tsx'
import StatRow from '../components/StatRow.tsx'
import StatTile from '../components/StatTile.tsx'
import { DOMAINS } from '../domains.ts'
import StatusBadge from '../components/StatusBadge.tsx'
import { flaggedInText, isFlagged } from '../flags.ts'
import { formatDate } from '../format.ts'
import { useChildren } from '../hooks/useChildren.ts'

export default function Dashboard() {
  const { children, errors, retry } = useChildren()

  if (errors.length > 0) return <LoadError errors={errors} onRetry={retry} />

  if (children === null) return <Loading />

  if (children.length === 0) {
    return (
      <div className="flex max-w-xl flex-col gap-4">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <div className="panel flex flex-col items-start gap-3 p-6">
          <p className="text-slate-700">No children screened yet.</p>
          <Link to="/assess" className="btn-primary">
            Start an assessment
          </Link>
        </div>
      </div>
    )
  }

  const latest = children.flatMap((child) => (child.latest ? [child.latest] : []))
  const flagged = latest.filter(isFlagged).length
  const assessments = children.reduce((total, child) => total + child.assessment_count, 0)
  const byDomain = DOMAINS.map(({ key, label }) => ({
    label,
    count: latest.filter((item) => item.rule_based.flagged_domains.includes(key)).length,
  }))

  const needsAttention = children.filter((child) => child.latest && isFlagged(child.latest))
  const recent = children.filter((child) => child.latest).slice(0, 8)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Link to="/assess" className="btn-primary">
          New assessment
        </Link>
      </div>

      <StatRow columns={4}>
        <StatTile label="Children screened" value={children.length} testId="total" />
        <StatTile label="Flagged" value={flagged} testId="flagged" />
        <StatTile label="Not flagged" value={latest.length - flagged} testId="not-flagged" />
        <StatTile label="Assessments" value={assessments} testId="assessments" />
      </StatRow>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel flex flex-col gap-3 p-5">
          <div>
            <h2 className="text-lg font-semibold">Children flagged by domain</h2>
            <p className="max-w-prose text-sm text-slate-600">
              Counts use each child&apos;s latest assessment. A child is counted in a domain when its z-score is more
              than 2 standard deviations below the group. A child flagged only by the Isolation Forest appears in the
              Flagged total but in no domain.
            </p>
          </div>
          <FlaggedDomainsChart data={byDomain} />
        </section>

        <section className="panel flex flex-col gap-3 p-5" data-testid="attention">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold">Needs review</h2>
            <Link to="/children" className="link text-sm">
              View all children
            </Link>
          </div>
          {needsAttention.length === 0 ? (
            <p className="text-sm text-slate-600">No flagged children. Every latest assessment is within the usual range.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-slate-100">
              {needsAttention.slice(0, 6).map((child) => (
                <li key={child.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5">
                  <div className="flex flex-col">
                    <Link to={`/children/${child.id}`} className="link w-fit font-medium">
                      {child.child_id}
                    </Link>
                    <span className="text-sm text-slate-600">
                      {child.latest ? flaggedInText(child.latest) : '-'}
                    </span>
                  </div>
                  <span className="text-sm text-slate-600">
                    {child.latest ? `${child.latest.age_months} months, ${formatDate(child.latest.assessed_at)}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {needsAttention.length > 6 && (
            <p className="text-sm text-slate-600">
              Showing 6 of {needsAttention.length} flagged children. The Children page lists them all.
            </p>
          )}
        </section>
      </div>

      <section className="flex flex-col gap-2" data-testid="recent">
        <h2 className="text-lg font-semibold">Recent assessments</h2>
        <div className="panel overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Child ID</th>
                <th scope="col">Date</th>
                <th scope="col">Age (months)</th>
                <th scope="col">Status</th>
                <th scope="col">Flagged in</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((child) => (
                <tr key={child.id}>
                  <th scope="row">
                    <Link to={`/children/${child.id}`} className="link">
                      {child.child_id}
                    </Link>
                  </th>
                  <td className="whitespace-nowrap">{child.latest ? formatDate(child.latest.assessed_at) : '-'}</td>
                  <td className="tabular-nums">{child.latest?.age_months ?? '-'}</td>
                  <td>{child.latest ? <StatusBadge flagged={isFlagged(child.latest)} /> : '-'}</td>
                  <td>{child.latest ? flaggedInText(child.latest) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-600">Each child&apos;s latest assessment, newest first.</p>
      </section>
    </div>
  )
}
