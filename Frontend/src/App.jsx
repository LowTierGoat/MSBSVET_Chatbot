// src/App.jsx
import { useState } from 'react'
import QueryInput from './components/QueryInput'
import ThinkingIndicator from './components/ThinkingIndicator'
import ResultsTable from './components/ResultsTable'
import SqlToggle from './components/SqlToggle'
import './App.css'

export default function App() {
  const [question, setQuestion]   = useState('')
  const [loading, setLoading]     = useState(false)
  const [response, setResponse]   = useState(null)   // { question, sql, row_count, results }
  const [error, setError]         = useState(null)

  async function handleQuery(q) {
    setLoading(true)
    setError(null)
    setResponse(null)

    try {
      const res = await fetch('http://localhost:8000/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail?.error || 'Something went wrong')
      setResponse(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '48px 24px' }}>

      {/* Header */}
      <header style={{ marginBottom: '48px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{
            width: '10px', height: '10px', borderRadius: '50%',
            background: 'var(--accent)',
            boxShadow: '0 0 12px var(--accent)'
          }} />
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: '11px',
            color: 'var(--accent)', letterSpacing: '0.15em', textTransform: 'uppercase'
          }}>
            MSBSVET ChatBot
          </span>
        </div>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: '36px',
          fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1
        }}>
          Query the Network
        </h1>
        <p style={{
          marginTop: '8px', color: 'var(--text-secondary)',
          fontFamily: 'var(--font-body)', fontSize: '15px'
        }}>
          Ask anything about institutions under MSBSVET.
        </p>
      </header>

      {/* Query Input */}
      <QueryInput
        value={question}
        onChange={setQuestion}
        onSubmit={handleQuery}
        disabled={loading}
      />

      {/* Thinking */}
      {loading && <ThinkingIndicator />}

      {/* Error */}
      {error && (
        <div style={{
          marginTop: '24px', padding: '16px 20px',
          background: 'rgba(239,83,80,0.08)', border: '1px solid rgba(239,83,80,0.3)',
          borderRadius: 'var(--radius)', color: 'var(--error)',
          fontFamily: 'var(--font-mono)', fontSize: '13px'
        }}>
          ⚠ {error}
        </div>
      )}

      {/* Results */}
      {response && !loading && (
        <div style={{ marginTop: '32px' }}>
          {/* Meta bar */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: '16px'
          }}>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-secondary)'
            }}>
              {response.row_count} row{response.row_count !== 1 ? 's' : ''} returned
            </span>
            <SqlToggle sql={response.sql} />
          </div>

          <ResultsTable results={response.results} />
        </div>
      )}
    </div>
  )
}