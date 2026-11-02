import { Bar, BarChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import ChartTable from './ChartTable.tsx'

type Props = {
  edges: number[]
  counts: number[]
  threshold: number
}

export default function ScoreHistogram({ edges, counts, threshold }: Props) {
  const bins = counts.map((count, index) => ({
    start: edges[index],
    label: `${edges[index].toFixed(2)} to ${edges[index + 1].toFixed(2)}`,
    count,
  }))
  const thresholdBin = bins.find((_, index) => threshold >= edges[index] && threshold < edges[index + 1])

  return (
    <div className="flex flex-col gap-2">
      <div role="img" aria-label="Histogram of Isolation Forest scores for the test records" data-testid="histogram">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={bins} margin={{ top: 16, right: 8, bottom: 4, left: 0 }}>
            <XAxis
              dataKey="start"
              tickFormatter={(value: number) => value.toFixed(2)}
              interval={3}
              tick={{ fontSize: 12, fill: '#475569' }}
              axisLine={{ stroke: '#cbd5e1' }}
              tickLine={false}
            />
            <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#475569' }} axisLine={false} tickLine={false} width={32} />
            <Tooltip
              cursor={{ fill: '#f1f5f9' }}
              labelFormatter={(_, payload) => `Score ${payload?.[0]?.payload?.label ?? ''}`}
              formatter={(value) => [`${value} records`, 'Records']}
            />
            {thresholdBin && (
              <ReferenceLine
                x={thresholdBin.start}
                stroke="#0f172a"
                strokeDasharray="4 3"
                label={{ value: `flag below ${threshold}`, position: 'top', fontSize: 12, fill: '#0f172a' }}
              />
            )}
            <Bar dataKey="count" fill="#1d4ed8" radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartTable columns={['Score range', 'Records']} rows={bins.map((bin) => [bin.label, bin.count])} />
    </div>
  )
}