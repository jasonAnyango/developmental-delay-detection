import type { ReactNode } from 'react'
import BrandMark from './BrandMark.tsx'

type Props = {
  title: string
  notice?: string
  errors: string[]
  children: ReactNode
}

function GrowthCurves() {
  return (
    <svg
      viewBox="0 0 400 600"
      preserveAspectRatio="xMidYMid slice"
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      <g fill="none" stroke="#ffffff" strokeOpacity="0.14" strokeWidth="1.5">
        <path d="M-20 590 C120 560 240 470 420 400" />
        <path d="M-20 570 C110 520 220 380 420 260" />
        <path d="M-20 550 C100 470 200 300 420 120" />
      </g>
      <path d="M-20 580 C120 545 235 440 420 330" fill="none" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="2" strokeDasharray="2 7" strokeLinecap="round" />
      <g fill="#ffffff" fillOpacity="0.5">
        <circle cx="70" cy="560" r="4" />
        <circle cx="170" cy="505" r="4" />
        <circle cx="285" cy="420" r="4" />
      </g>
    </svg>
  )
}

export default function AuthCard({ title, notice, errors, children }: Props) {
  return (
    <div className="grid min-h-screen grid-rows-[auto_1fr] lg:grid-cols-[5fr_6fr] lg:grid-rows-1">
      <aside className="relative overflow-hidden bg-brand-800 px-6 py-6 text-white lg:flex lg:items-center lg:px-14 lg:py-16">
        <GrowthCurves />
        <div className="relative flex max-w-md flex-col gap-5">
          <div className="flex items-center gap-3">
            <BrandMark inverse className="h-9 w-9" />
            <span className="text-xl font-bold tracking-tight">SOPHIA</span>
          </div>
          <p className="text-xl font-semibold leading-snug lg:text-3xl">
            Screening support for early childhood development
          </p>
          <p className="hidden text-brand-100 lg:block">
            Record the milestones a child has reached. SOPHIA compares them with a reference group and flags patterns
            that may need a closer look.
          </p>
          <p className="hidden border-t border-white/20 pt-4 text-sm text-brand-100 lg:block">
            A screening tool, not a diagnosis. Clinical judgement always comes first.
          </p>
        </div>
      </aside>

      <main className="flex items-start justify-center px-4 py-8 sm:px-8 lg:items-center lg:py-10">
        <div className="flex w-full max-w-sm flex-col gap-4">
          <h1 className="text-2xl font-semibold">{title}</h1>
          {notice && (
            <p role="status" className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-900">
              {notice}
            </p>
          )}
          {errors.length > 0 && (
            <div role="alert" className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
              {errors.map((message) => (
                <p key={message}>{message}</p>
              ))}
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  )
}