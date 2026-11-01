type Props = {
  label: string
  value: number
  testId: string
}

export default function StatTile({ label, value, testId }: Props) {
  return (
    <div className="rounded border border-slate-200 bg-white px-4 py-3">
      <p className="text-sm text-slate-600">{label}</p>
      <p className="text-3xl font-semibold" data-testid={testId}>
        {value}
      </p>
    </div>
  )
}