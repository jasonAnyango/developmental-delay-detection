import { Link } from 'react-router-dom'
import FlaggedDomainsChart from '../components/FlaggedDomainsChart.tsx'
import LoadError from '../components/LoadError.tsx'
import Loading from '../components/Loading.tsx'
import StatRow from '../components/StatRow.tsx'
import StatTile from '../components/StatTile.tsx'
import { DOMAINS } from '../domains.ts'
import { isFlagged } from '../flags.ts'
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

  return (
    <div className="flex max-w-4xl flex-col gap-6">
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
    </div>
  )
}