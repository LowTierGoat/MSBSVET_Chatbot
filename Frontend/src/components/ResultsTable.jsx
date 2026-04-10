// src/components/ResultsTable.jsx
export default function ResultsTable({ results }) {
  if (!results || results.length === 0) {
    return (
      <div style={{
        padding: '40px', textAlign: 'center',
        color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '13px',
        border: '1px solid var(--border)', borderRadius: 'var(--radius)',
      }}>
        Query ran successfully — no rows matched the condition.
      </div>
    )
  }

  const columns = Object.keys(results[0])

  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      overflow: 'hidden',
    }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-raised)' }}>
              {columns.map(col => (
                <th key={col} style={{
                  padding: '12px 16px', textAlign: 'left',
                  fontFamily: 'var(--font-mono)', fontSize: '11px',
                  color: 'var(--accent)', letterSpacing: '0.1em',
                  textTransform: 'uppercase', fontWeight: 500,
                  borderBottom: '1px solid var(--border)',
                  whiteSpace: 'nowrap',
                }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.map((row, i) => (
              <tr key={i} style={{
                background: i % 2 === 0 ? 'var(--bg-panel)' : 'var(--bg-base)',
                transition: 'var(--transition)',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'var(--bg-panel)' : 'var(--bg-base)'}
              >
                {columns.map(col => (
                  <td key={col} style={{
                    padding: '11px 16px',
                    fontFamily: typeof row[col] === 'number' ? 'var(--font-mono)' : 'var(--font-body)',
                    fontSize: '13px', color: 'var(--text-primary)',
                    borderBottom: '1px solid var(--border)',
                    whiteSpace: 'nowrap',
                  }}>
                    {row[col] === null ? (
                      <span style={{ color: 'var(--text-muted)' }}>null</span>
                    ) : typeof row[col] === 'number' ? (
                      row[col].toLocaleString('en-IN')
                    ) : (
                      String(row[col])
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}