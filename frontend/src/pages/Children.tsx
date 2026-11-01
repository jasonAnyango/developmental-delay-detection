import { useState } from 'react'
import { Link } from 'react-router-dom'
import LoadError from '../components/LoadError.tsx'
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
        <p className="text-slate-600">No children screened yet.</p>
        <Link to="/assess" className="w-fit rounded bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800">
          Start an assessment
        </Link>
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
              className={`rounded border px-3 py-1.5 text-sm ${
                filter === tab.value
                  ? 'border-blue-700 bg-blue-700 text-white'
                  : 'border-slate-300 bg-white text-slate-800 hover:border-blue-700'
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
            className="rounded border border-slate-300 px-3 py-1.5 font-normal focus:outline-none focus:ring-2 focus:ring-blue-600"
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
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-300">
                <th scope="col" className="py-2 pr-4 font-medium">
                  Child ID
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Status
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Flagged in
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Age (months)
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Last assessed
                </th>
                <th scope="col" className="py-2 font-medium">
                  Assessments
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map((child) => (
                <tr key={child.id} className="border-b border-slate-200" data-testid="row">
                  <th scope="row" className="py-2 pr-4 font-medium">
                    <Link to={`/children/${child.id}`} className="text-blue-700 underline">
                      {child.child_id}
                    </Link>
                  </th>
                  <td className="py-2 pr-4">{child.latest ? (isFlagged(child.latest) ? 'Flagged' : 'Not flagged') : '-'}</td>
                  <td className="py-2 pr-4">{child.latest ? flaggedInText(child.latest) : '-'}</td>
                  <td className="py-2 pr-4">{child.latest?.age_months ?? '-'}</td>
                  <td className="py-2 pr-4">{child.latest ? formatDate(child.latest.assessed_at) : '-'}</td>
                  <td className="py-2">{child.assessment_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}