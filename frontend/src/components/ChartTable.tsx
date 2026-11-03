type Props = {
  columns: string[]
  rows: (string | number)[][]
}

export default function ChartTable({ columns, rows }: Props) {
  return (
    <details className="text-sm">
      <summary className="link cursor-pointer">Show as table</summary>
      <div className="panel mt-2 max-w-xl overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column} scope="col">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={String(row[0])}>
                {row.map((cell, index) =>
                  index === 0 ? (
                    <th key={index} scope="row">
                      {cell}
                    </th>
                  ) : (
                    <td key={index} className="tabular-nums">
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