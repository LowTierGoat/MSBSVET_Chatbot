// src/App.jsx

import { useState } from 'react'
import ChartRenderer from './components/ChartRenderer'
import QueryInput from './components/QueryInput'
import ThinkingIndicator from './components/ThinkingIndicator'
import ResultsTable from './components/ResultsTable'
import SqlToggle from './components/SqlToggle'
import './App.css'

export default function App() {
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState(null)
  const [error, setError] = useState(null)
  const [history, setHistory] = useState([])

  async function handleQuery(q) {
  setLoading(true)
  setError(null)
  setResponse(null)

  const userMsg = { role: "user", content: q }

  try {
    const res = await fetch('http://localhost:8000/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        question: q,
        history: history,
        context: response
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      const errorMsg =
        data.detail?.error || data.detail || 'Something went wrong'
      throw new Error(errorMsg)
    }

    setResponse(data)

    // Save conversation history
    setHistory(prev => [
      ...prev,
      userMsg,
      { role: "assistant", content: `Action: ${data.ui_directive}` }
    ])

  } catch (err) {
    console.error('Frontend Error:', err)
    setError(err.message)
  } finally {
    setLoading(false)
  }
}

  return (
    <div
      style={{
        maxWidth: '1100px',
        margin: '0 auto',
        padding: '48px 24px',
      }}
    >
      {/* --- HEADER --- */}
      <header style={{ marginBottom: '48px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '8px',
          }}
        >
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: 'var(--accent)',
              boxShadow: '0 0 12px var(--accent)',
            }}
          />
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--accent)',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
            }}
          >
            MSBSVET ChatBot
          </span>
        </div>

        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '36px',
            fontWeight: 800,
            color: 'var(--text-primary)',
            lineHeight: 1.1,
          }}
        >
          Query the Network
        </h1>

        <p
          style={{
            marginTop: '8px',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-body)',
            fontSize: '15px',
          }}
        >
          Ask anything about vocational institutes and courses in Maharashtra.
        </p>
      </header>

      {/* --- INPUT --- */}
      <QueryInput
        value={question}
        onChange={setQuestion}
        onSubmit={handleQuery}
        disabled={loading}
      />

      {/* --- STATES (Loading / Error) --- */}
      {loading && <ThinkingIndicator />}

      {error && (
        <div
          style={{
            marginTop: '24px',
            padding: '16px 20px',
            background: 'rgba(239,83,80,0.08)',
            border: '1px solid rgba(239,83,80,0.3)',
            borderRadius: 'var(--radius)',
            color: 'var(--error)',
            fontFamily: 'var(--font-mono)',
            fontSize: '13px',
          }}
        >
          ⚠ {error}
        </div>
      )}

      {/* --- DEBUG SPY (Hidden Toggle) --- */}
      {response && (
        <details style={{ marginTop: '20px', opacity: 0.5 }}>
          <summary
            style={{
              fontSize: '11px',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
            }}
          >
            [DEBUG] RAW API PAYLOAD
          </summary>

          <pre
            style={{
              fontSize: '10px',
              color: '#00ff00',
              padding: '15px',
              background: '#000',
              borderRadius: '4px',
              marginTop: '10px',
              overflowX: 'auto',
            }}
          >
            {JSON.stringify(response, null, 2)}
          </pre>
        </details>
      )}

      {/* --- MAIN RESULTS AREA --- */}
      {response && !loading && (
        <div
          style={{
            marginTop: '32px',
            padding: '24px',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            background: 'var(--bg-panel)',
            animation: 'fadeIn 0.4s ease-out',
          }}
        >
          {/* Top Metadata Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
              paddingBottom: '16px',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
              }}
            >
              {response.ui_directive === 'render_chart'
                ? '📊 Visual Insight'
                : response.ui_directive === 'render_data_table'
                ? '🔢 Data Table'
                : '💬 Response'}
              {response.row_count !== null &&
                response.row_count !== undefined &&
                ` · ${response.row_count} rows`}
            </span>

            {response.sql && <SqlToggle sql={response.sql} />}
          </div>

          {/* DYNAMIC CONTENT SWITCHER */}
          {(() => {
            const { ui_directive, results, chart_config } = response

            // 1. CHART VIEW
            if (ui_directive === 'render_chart' && chart_config) {
              return (
                <>
                  <ChartRenderer data={results} config={chart_config} />

                  <div style={{ marginTop: '40px' }}>
                    <h4
                      style={{
                        fontSize: '11px',
                        color: 'var(--accent)',
                        marginBottom: '16px',
                        fontFamily: 'var(--font-mono)',
                        letterSpacing: '0.1em',
                      }}
                    >
                      SOURCE DATA
                    </h4>

                    <ResultsTable results={results} />
                  </div>
                </>
              )
            }

            // 2. TABLE VIEW
            if (
              ui_directive === 'render_data_table' ||
              Array.isArray(results)
            ) {
              return <ResultsTable results={results} />
            }

            // 3. TEXT VIEW (Fallback)
            return (
              <div
                style={{
                  color: 'var(--text-primary)',
                  lineHeight: 1.8,
                  fontSize: '16px',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {typeof results === 'string'
                  ? results
                  : 'No displayable data found.'}
              </div>
            )
          })()}
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}