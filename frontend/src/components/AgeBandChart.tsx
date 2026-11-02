import { Bar, BarChart, CartesianGrid, Legend, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import ChartTable from './ChartTable.tsx'

export type AgeBandRow = { label: string; rows: number; forest: number; rules: number }

export default function AgeBandChart({ data }: { data: AgeBandRow[] }) {
  return (
    <div className="flex flex-col gap-2">
      <div role="img" aria-label="Grouped bar chart of records flagged by each method in each age group" data-testid="ageband">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 16, right: 8, bottom: 4, left: 0 }}>
            <CartesianGrid vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#475569' }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#475569' }} axisLine={false} tickLine={false} width={32} />
            <Tooltip cursor={{ fill: '#f1f5f9' }} />
            <Legend verticalAlign="top" height={28} />
            <Bar dataKey="forest" name="Isolation Forest" fill="#0b86a0" radius={[4, 4, 0, 0]} isAnimationActive={false}>
              <LabelList dataKey="forest" position="top" fontSize={11} fill="#0f172a" />
            </Bar>
            <Bar dataKey="rules" name="Rule-based" fill="#c2410c" radius={[4, 4, 0, 0]} isAnimationActive={false}>
              <LabelList dataKey="rules" position="top" fontSize={11} fill="#0f172a" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartTable
        columns={['Age group (months)', 'Test records', 'Isolation Forest', 'Rule-based']}
        rows={data.map((row) => [row.label, row.rows, row.forest, row.rules])}
      />
    </div>
  )
}