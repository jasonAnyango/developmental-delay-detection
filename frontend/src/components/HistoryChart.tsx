import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Assessment } from '../api/api.ts'
import { DOMAINS, type DomainName } from '../domains.ts'
import { formatDate, zText } from '../format.ts'
import { TOOLTIP } from './chartStyle.ts'

const THRESHOLD = -2

const LINES: Record<DomainName, { color: string; dash?: string }> = {
  cognitive: { color: '#0b6e85' },
  motor: { color: '#7c3aed', dash: '6 3' },
  language: { color: '#15803d', dash: '2 3' },
  social_emotional: { color: '#be185d', dash: '8 3 2 3' },
}

function ticksBetween(from: number, to: number, step: number) {
  const ticks: number[] = []
  for (let value = from; value <= to; value += step) ticks.push(value)
  return ticks
}

export default function HistoryChart({ assessments }: { assessments: Assessment[] }) {
  const data = assessments.map((item) => ({
    age: item.age_months,
    date: formatDate(item.assessed_at),
    ...item.z_scores,
  }))
  const values = data.flatMap((row) => DOMAINS.map(({ key }) => row[key]).filter((value) => value !== null))
  const low = Math.floor(Math.min(-3, ...values))
  const high = Math.ceil(Math.max(2, ...values))
  const ages = data.map((row) => row.age)
  const firstAge = Math.floor(Math.min(...ages) - 1)
  const lastAge = Math.ceil(Math.max(...ages) + 1)
  const yTicks = ticksBetween(low, high, 1)
  const xTicks = ticksBetween(firstAge, lastAge, Math.ceil((lastAge - firstAge) / 10))

  return (
    <div className="flex flex-col gap-2">
      <div role="img" aria-label="Line chart of the child's z-scores in each domain over time" data-testid="history-chart">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={data} margin={{ top: 16, right: 24, bottom: 20, left: 0 }}>
            <CartesianGrid vertical={false} stroke="#e3eaec" />
            <XAxis
              type="number"
              dataKey="age"
              domain={[firstAge, lastAge]}
              ticks={xTicks}
              tick={{ fontSize: 12, fill: '#4b6068' }}
              axisLine={{ stroke: '#d5dfe1' }}
              tickLine={false}
              label={{ value: 'Age (months)', position: 'insideBottom', offset: -12, fontSize: 12, fill: '#4b6068' }}
            />
            <YAxis
              domain={[low, high]}
              ticks={yTicks}
              tick={{ fontSize: 12, fill: '#4b6068' }}
              axisLine={false}
              tickLine={false}
              width={36}
              label={{ value: 'Z-score', angle: -90, position: 'insideLeft', fontSize: 12, fill: '#4b6068' }}
            />
            <ReferenceLine y={0} stroke="#94a3b8" label={{ value: 'Group average', position: 'insideTopRight', fontSize: 11, fill: '#4b6068' }} />
            <ReferenceLine
              y={THRESHOLD}
              stroke="#b45309"
              strokeDasharray="4 4"
              label={{ value: 'Flag threshold (-2)', position: 'insideBottomRight', fontSize: 11, fill: '#92400e' }}
            />
            <Tooltip
              contentStyle={TOOLTIP}
              labelFormatter={(label, payload) => `Age ${label} months${payload?.[0] ? `, ${payload[0].payload.date}` : ''}`}
              formatter={(value) => zText(typeof value === 'number' ? value : null)}
            />
            <Legend verticalAlign="top" height={28} />
            {DOMAINS.map(({ key, label }) => (
              <Line
                key={key}
                type="linear"
                dataKey={key}
                name={label}
                stroke={LINES[key].color}
                strokeDasharray={LINES[key].dash}
                strokeWidth={2}
                dot={{ r: 4, fill: LINES[key].color, strokeDasharray: '0' }}
                activeDot={{ r: 6, strokeDasharray: '0' }}
                connectNulls={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-slate-600">
        Each point is one assessment, placed by the child&apos;s age at the time. A score below the dashed line is more
        than 2 standard deviations below the reference group. Domains with too few answered items have no point.
        {assessments.length === 1 && ' Only one assessment has been recorded, so no trend is drawn yet.'}
      </p>
    </div>
  )
}
