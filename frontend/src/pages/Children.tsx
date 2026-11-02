import { useState } from 'react'
import { Link } from 'react-router-dom'
import LoadError from '../components/LoadError.tsx'
import StatusBadge from '../components/StatusBadge.tsx'
import { flaggedInText, isFlagged } from '../flags.ts'
import { formatDate } from '../format.ts'
import { useChildren } from '../hooks/useChildren.ts'

type Filter = 'flagged' | 'all'

export default function Children() {
  const { children, errors, retry } = useChildren()
  const [filter, setFilter] = useState<Filter>('flagged')
  const [query, setQuery] = useState('')

  if (errors.length > 0) return <LoadError errors={errors} onRetry={retry} />
  if (children === null) return <p className="text-slate-600">Loading...</p>

  if (children.length === 0) {
    return (
      <div className="flex max-w-xl flex-col gap-3">
        <h1 className="text-2xl font-semibold">Children</h1>
        <div className="panel flex flex-col items-start gap-3 p-6">
          <p className="text-slate-700">No children screened yet.</p>
          <Link to="/assess" className="btn-primary">
            Start an assessment
          </Link>
        </div>
      </div>
    )
  }

  const flaggedChildren = children.filter((child) => child.latest && isFlagged(child.latest))
  const byFilter = filter === 'flagged' ? flaggedChildren : children
  const search = query.trim().toLowerCase()
  const shown = search ? byFilter.filter((child) => child.child_id.toLowerCase().includes(search)) : byFilter

  const tabs: { value: Filter; label: string; count: number }[] = [
    { value: 'flagged', label: 'Flagged', count: flaggedChildren.length },
    { value: 'all', label: 'All children', count: children.length },
  ]

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Children</h1>

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex gap-2" role="group" aria-label="Show">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              aria-pressed={filter === tab.value}
              className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
                filter === tab.value
                  ? 'border-brand-700 bg-brand-700 text-white'
                  : 'border-slate-300 bg-white text-slate-800 hover:border-brand-700'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-800">
          Search by child ID
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="input w-full max-w-xs font-normal"
          />
        </label>
      </div>

      <p className="text-sm text-slate-600" data-testid="count">
        Showing {shown.length} of {byFilter.length} {filter === 'flagged' ? 'flagged ' : ''}children. Status uses each
        child&apos;s latest assessment.
      </p>

      {shown.length === 0 ? (
        <p data-testid="empty" className="text-slate-600">
          {search
            ? `No children match "${query.trim()}".`
            : 'No flagged children. Switch to All children to see everyone.'}
        </p>
      ) : (
        <div className="panel overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Child ID</th>
                <th scope="col">Status</th>
                <th scope="col">Flagged in</th>
                <th scope="col">Age (months)</th>
                <th scope="col">Last assessed</th>
                <th scope="col">Assessments</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((child) => (
                <tr key={child.id} data-testid="row">
                  <th scope="row">
                    <Link to={`/children/${child.id}`} className="link">
                      {child.child_id}
                    </Link>
                  </th>
                  <td>{child.latest ? <StatusBadge flagged={isFlagged(child.latest)} /> : '-'}</td>
                  <td>{child.latest ? flaggedInText(child.latest) : '-'}</td>
                  <td className="tabular-nums">{child.latest?.age_months ?? '-'}</td>
                  <td>{child.latest ? formatDate(child.latest.assessed_at) : '-'}</td>
                  <td className="tabular-nums">{child.assessment_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}