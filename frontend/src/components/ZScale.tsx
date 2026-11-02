const MIN = -4
const MAX = 3
const THRESHOLD = -2

function place(value: number) {
  return ((Math.min(Math.max(value, MIN), MAX) - MIN) / (MAX - MIN)) * 100
}

export default function ZScale({ z }: { z: number | null }) {
  if (z === null) return <span className="text-slate-400">-</span>
  const below = z < THRESHOLD

  return (
    <div className="relative h-5 w-44" aria-hidden="true">
      <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-slate-200" />
      <div
        className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-l-full bg-amber-200"
        style={{ left: 0, width: `${place(THRESHOLD)}%` }}
      />
      <div className="absolute top-1 h-3 w-px bg-slate-400" style={{ left: `${place(0)}%` }} />
      <div className="absolute inset-y-0 w-px bg-amber-700" style={{ left: `${place(THRESHOLD)}%` }} />
      <div
        className={`absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow ${
          below ? 'bg-amber-700' : 'bg-brand-700'
        }`}
        style={{ left: `${place(z)}%` }}
      />
    </div>
  )
}