import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type ChildSummary } from '../api/api.ts'
import { errorMessages } from '../api/client.ts'
import FlaggedDomainsChart from '../components/FlaggedDomainsChart.tsx'
import StatTile from '../components/StatTile.tsx'
import { DOMAINS } from '../domains.ts'
import { isFlagged } from '../flags.ts'

export default function Dashboard() {
  const [children, setChildren] = useState<ChildSummary[] | null>(null)
  const [errors, setErrors] = useState<string[]>([])

  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    api
      .children()
      .then((response) => active && setChildren(response.children))
      .catch((error) => active && setErrors(errorMessages(error)))
    return () => {
      active = false
    }
  }, [attempt])

  function retry() {
    setErrors([])
    setChildren(null)
    setAttempt((current) => current + 1)
  }

  if (errors.length > 0) {
    return (
      <div role="alert" className="flex max-w-xl flex-col gap-2 rounded border border-red-300 bg-red-50 px-4 py-3 text-red-900">
        {errors.map((message) => (
          <p key={message}>{message}</p>
        ))}
        <button onClick={retry} className="w-fit text-blue-700 underline">
          Try again
        </button>
      </div>
    )
  }

  if (children === null) return <p className="text-slate-600">Loading...</p>

  if (children.length === 0) {
    return (
      <div className="flex max-w-xl flex-col gap-3">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-slate-600">No children screened yet.</p>
        <Link to="/assess" className="w-fit rounded bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800">
          Start an assessment
        </Link>
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
    <div className="flex max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Children screened" value={children.length} testId="total" />
        <StatTile label="Flagged" value={flagged} testId="flagged" />
        <StatTile label="Not flagged" value={latest.length - flagged} testId="not-flagged" />
        <StatTile label="Assessments" value={assessments} testId="assessments" />
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">Children flagged by domain</h2>
        <p className="text-sm text-slate-600">
          Counts use each child&apos;s latest assessment. A child is counted in a domain when its z-score is more
          than 2 standard deviations below the group. A child flagged only by the Isolation Forest appears in
          the Flagged total but in no domain.
        </p>
        <FlaggedDomainsChart data={byDomain} />
      </section>
    </div>
  )
}