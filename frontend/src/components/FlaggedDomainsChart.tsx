import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export type DomainCount = { label: string; count: number }

export default function FlaggedDomainsChart({ data }: { data: DomainCount[] }) {
  return (
    <div className="flex flex-col gap-2">
      <div role="img" aria-label="Bar chart of children flagged in each domain" data-testid="chart">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 32, bottom: 4, left: 0 }}>
            <XAxis
              type="number"
              allowDecimals={false}
              domain={[0, (max: number) => Math.max(max, 1)]}
              tick={{ fontSize: 12, fill: '#475569' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={120}
              tick={{ fontSize: 13, fill: '#0f172a' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: '#f1f5f9' }}
              formatter={(value) => [`${value} ${value === 1 ? 'child' : 'children'}`, 'Flagged']}
            />
            <Bar dataKey="count" fill="#1d4ed8" barSize={16} radius={[0, 4, 4, 0]} isAnimationActive={false}>
              <LabelList dataKey="count" position="right" fontSize={12} fill="#0f172a" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-blue-700 underline">Show as table</summary>
        <table className="mt-2 w-full max-w-sm text-left">
          <thead>
            <tr className="border-b border-slate-300">
              <th scope="col" className="py-1 pr-4 font-medium">
                Domain
              </th>
              <th scope="col" className="py-1 font-medium">
                Children flagged
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.label} className="border-b border-slate-200">
                <th scope="row" className="py-1 pr-4 font-normal">
                  {row.label}
                </th>
                <td className="py-1">{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}