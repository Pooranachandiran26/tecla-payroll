import { classNames } from '../../../Utils/formatters';

export default function DataTable({ columns = [], data = [], keyField = 'id', className = '' }) {
  return (
    <div className={classNames('table-responsive', className)}>
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col, index) => (
              <th key={col.key || index} style={col.style} className={col.className}>
                {col.label}
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
                {columns.map((col, colIndex) => (
                  <td key={col.key || colIndex} style={col.style} className={col.className}>
                    {col.render ? col.render(row[col.key], row, rowIndex) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
