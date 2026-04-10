// src/components/QueryInput.jsx
import { useRef } from 'react'

export default function QueryInput({ value, onChange, onSubmit, disabled }) {
  const textareaRef = useRef(null)

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (value.trim() && !disabled) onSubmit(value.trim())
    }
  }

  return (
    <div style={{
      background: 'var(--bg-panel)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: '4px',
      transition: 'var(--transition)',
    }}
      onFocus={() => {}}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="e.g. How much intake capaciy in nagpur?"
        rows={3}
        style={{
          width: '100%', background: 'transparent', border: 'none',
          outline: 'none', resize: 'none', padding: '16px',
          color: 'var(--text-primary)', fontFamily: 'var(--font-body)',
          fontSize: '15px', lineHeight: 1.6,
        }}
      />
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', padding: '8px 12px',
        borderTop: '1px solid var(--border)'
      }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: '11px',
          color: 'var(--text-muted)'
        }}>
          Enter ↵ to run · Shift+Enter for newline
        </span>
        <button
          onClick={() => value.trim() && !disabled && onSubmit(value.trim())}
          disabled={disabled || !value.trim()}
          style={{
            background: value.trim() && !disabled ? 'var(--accent)' : 'var(--bg-raised)',
            color: value.trim() && !disabled ? '#0f0f0f' : 'var(--text-muted)',
            border: 'none', borderRadius: 'var(--radius)',
            padding: '8px 20px', fontFamily: 'var(--font-display)',
            fontWeight: 700, fontSize: '13px', cursor: 'pointer',
            transition: 'var(--transition)',
          }}
        >
          Run Query
        </button>
      </div>
    </div>
  )
}