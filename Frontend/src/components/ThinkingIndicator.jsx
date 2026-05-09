// src/components/ThinkingIndicator.jsx
import { useEffect, useState } from 'react'

const DEFAULT_MESSAGES = [
  'Parsing your question...',
  'Generating SQL query...',
  'Validating against schema...',
  'Executing on database...',
  'Assembling results...',
]

export default function ThinkingIndicator({
  messages = DEFAULT_MESSAGES,
  interval = 1800,
}) {
  const [msgIndex, setMsgIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setMsgIndex((i) => (i + 1) % messages.length)
    }, interval)

    return () => clearInterval(id)
  }, [messages, interval])

  return (
    <div className="thinking-container">
      <div className="thinking-dots">
        {[0, 1, 2].map((i) => (
          <span key={i} className="dot" style={{ animationDelay: `${i * 0.2}s` }} />
        ))}
      </div>

      <span className="thinking-text">
        {messages[msgIndex]}
      </span>

      <style>{`
        .thinking-container {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          margin-top: 16px;
          background: var(--bg-panel);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          width: fit-content;
        }

        .thinking-dots {
          display: flex;
          gap: 5px;
        }

        .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--accent);
          animation: pulse 1.2s ease-in-out infinite;
        }

        .thinking-text {
          font-family: var(--font-mono);
          font-size: 13px;
          color: var(--text-secondary);
          transition: opacity 0.3s ease;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 0.2;
            transform: scale(0.8);
          }
          50% {
            opacity: 1;
            transform: scale(1.1);
          }
        }
      `}</style>
    </div>
  )
}