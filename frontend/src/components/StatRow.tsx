import type { ReactNode } from 'react'

const COLUMNS = {
  3: 'grid-cols-1 sm:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-4',
}

type Props = {
  columns: 3 | 4
  children: ReactNode
}

export default function StatRow({ columns, children }: Props) {
  return <div className={`panel grid gap-px overflow-hidden bg-slate-200 ${COLUMNS[columns]}`}>{children}</div>
}