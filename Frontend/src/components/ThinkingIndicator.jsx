// src/components/ThinkingIndicator.jsx
import { useEffect, useState } from 'react'

const MESSAGES = [
  'Parsing your question...',
  'Generating SQL query...',
  'Validating against schema...',
  'Executing on database...',
  'Assembling results...',
]

export default function ThinkingIndicator() {
  const [msgIndex, setMsgIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex(i => (i + 1) % MESSAGES.length)
    }, 1800)
    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{
      marginTop: '24px', display: 'flex', alignItems: 'center', gap: '16px',
      padding: '20px 24px',
      background: 'var(--bg-panel)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
    }}>
      {/* Animated dots */}
      <div style={{ display: 'flex', gap: '5px' }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: '7px', height: '7px', borderRadius: '50%',
            background: 'var(--accent)',
            animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: '13px',
        color: 'var(--text-secondary)',
        transition: 'opacity 0.3s ease',
      }}>
        {MESSAGES[msgIndex]}
      </span>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50%       { opacity: 1;   transform: scale(1.1); }
        }
      `}</style>
    </div>
  )
}