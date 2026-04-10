// src/components/SqlToggle.jsx
import { useState } from 'react'

export default function SqlToggle({ sql }) {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: 'transparent',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-mono)',
          fontSize: '11px', padding: '6px 14px',
          cursor: 'pointer', letterSpacing: '0.05em',
          transition: 'var(--transition)',
        }}
        onMouseEnter={e => e.target.style.borderColor = 'var(--accent)'}
        onMouseLeave={e => e.target.style.borderColor = 'var(--border)'}
      >
        {open ? '▲ Hide SQL' : '▼ Show SQL'}
      </button>

      {open && (
        <div style={{
          marginTop: '12px',
          background: 'var(--bg-panel)',
          border: '1px solid var(--border)',
          borderLeft: '3px solid var(--accent)',
          borderRadius: 'var(--radius)',
          padding: '16px 20px',
          overflowX: 'auto',
        }}>
          <pre style={{
            fontFamily: 'var(--font-mono)', fontSize: '12px',
            color: 'var(--text-secondary)', lineHeight: 1.7,
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            margin: 0,
          }}>
            {sql}
          </pre>
        </div>
      )}
    </div>
  )
}