import { classNames } from '../../../Utils/formatters';

export default function DataTable({ columns = [], data = [], keyField = 'id', className = '' }) {
  return (
    <div className={classNames('table-responsive', className)}>
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col, index) => (
              <th key={col.key || col.accessor || index} style={col.style} className={col.className}>
                {col.label || col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{ textAlign: 'center', padding: '2rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>No data available</span>
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr key={row[keyField] || rowIndex}>
                {columns.map((col, colIndex) => {
                  const cellKey = col.key || col.accessor;
                  if (col.cell) {
                    return (
                      <td key={cellKey || colIndex} style={col.style} className={col.className}>
                        {col.cell(row, rowIndex)}
                      </td>
                    );
                  }
                  if (col.render) {
                    return (
                      <td key={cellKey || colIndex} style={col.style} className={col.className}>
                        {col.render(row[cellKey], row, rowIndex)}
                      </td>
                    );
                  }
                  return (
                    <td key={cellKey || colIndex} style={col.style} className={col.className}>
                      {row[cellKey]}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
