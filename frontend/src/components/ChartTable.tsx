type Props = {
  columns: string[]
  rows: (string | number)[][]
}

export default function ChartTable({ columns, rows }: Props) {
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-blue-700 underline">Show as table</summary>
      <div className="overflow-x-auto">
        <table className="mt-2 w-full max-w-xl text-left">
          <thead>
            <tr className="border-b border-slate-300">
              {columns.map((column) => (
                <th key={column} scope="col" className="py-1 pr-4 font-medium">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={String(row[0])} className="border-b border-slate-200">
                {row.map((cell, index) =>
                  index === 0 ? (
                    <th key={index} scope="row" className="py-1 pr-4 font-normal">
                      {cell}
                    </th>
                  ) : (
                    <td key={index} className="py-1 pr-4">
                      {cell}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}