export default function StatusBadge({ flagged }: { flagged: boolean }) {
  if (flagged) {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-900">
        <svg viewBox="0 0 16 16" className="h-3 w-3" aria-hidden="true">
          <path d="M3 14V2.5M3 3h8.5l-2 3 2 3H3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Flagged
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
      <svg viewBox="0 0 16 16" className="h-3 w-3" aria-hidden="true">
        <path d="M3.5 8.5l3 3 6-6.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Not flagged
    </span>
  )
}