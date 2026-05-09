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

  // --- DEBUGGING & UTILITY ---
  const downloadCSV = (data) => {
    if (!data || !data.length) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => 
      Object.values(row).map(val => `"${val}"`).join(',')
    ).join('\n');
    const csvContent = `data:text/csv;charset=utf-8,${headers}\n${rows}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `msbsvet_query_results.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  async function handleQuery(q) {
    // START DEBUG GROUP
    console.group(`%c 🔎 MSBSVET QUERY: ${q}`, "color: #1a4188; font-weight: bold;");
    setLoading(true);
    setError(null);

    try {
      const payload = {
        question: q,
        history: history,
        context: response // Current data is passed as context for follow-ups
      };
      
      console.log("📤 Sending Payload:", payload);

      const res = await fetch('http://localhost:8000/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("❌ API Error Detail:", data.detail);
        throw new Error(data.detail?.error || 'Pipeline execution failed.');
      }

      console.log("📥 Received Response:", data);
      setResponse(data);

      // Maintain meaningful conversation history
      setHistory(prev => [
        ...prev,
        { role: "user", content: q },
        { role: "assistant", content: data.answer || '' }
      ]);

    } catch (err) {
      console.error("🚨 Frontend Catch:", err.message);
      setError(err.message);
    } finally {
      setLoading(false);
      console.groupEnd(); // END DEBUG GROUP
    }
  }

  return (
    <div className="app-container" style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 20px' }}>
      
      {/* GOVT STYLE HEADER */}
      <header style={{ 
        borderBottom: '2px solid var(--pbi-blue)', 
        paddingBottom: '20px', 
        marginBottom: '40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end'
      }}>
        <div>
          <h1 style={{ 
            fontSize: '32px', 
            color: 'var(--pbi-blue)', 
            margin: 0, 
            fontWeight: 700,
            letterSpacing: '-0.5px'
          }}>
            MSBSVET <span style={{ fontWeight: 300 }}>Assistant</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
            Maharashtra State Board of Skill, Vocational Education and Training
          </p>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--pbi-orange)', fontWeight: 600, textTransform: 'uppercase' }}>
          • Live Data Access
        </div>
      </header>

      {/* SEARCH SECTION */}
      <section className="query-section">
        <QueryInput
          value={question}
          onChange={setQuestion}
          onSubmit={handleQuery}
          disabled={loading}
        />
      </section>

      {loading && <ThinkingIndicator />}

      {error && (
        <div style={{
          marginTop: '24px', padding: '16px',
          background: '#fff5f5', border: '1px solid #feb2b2',
          borderRadius: 'var(--radius)', color: '#c53030',
          fontSize: '14px', display: 'flex', gap: '8px'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      {response && !loading && (
        <main className="fade-in" style={{ marginTop: '30px' }}>
          
          <div className="response-card" style={{
            background: '#fff',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius)',
            padding: '30px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            overflow: 'hidden',
            position: 'relative'
          }}>
            
            {/* ACTION BAR */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '24px',
              paddingBottom: '12px',
              borderBottom: '1px solid #eee'
            }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--pbi-blue)' }}>
                {response.data ? `FOUND ${response.row_count} RECORDS` : 'EXPLANATION'}
              </span>
              
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                
                {response.data && response.data.length > 0 && (
                  <button 
                    onClick={() => downloadCSV(response.data)}
                    style={{
                      background: 'none',
                      border: '1px solid var(--border-color)',
                      padding: '4px 12px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '11px',
                      color: 'var(--text-main)'
                    }}>
                    📥 Export CSV
                  </button>
                )}
            
                {/* ✅ Debug button added here */}
                <button 
                  onClick={() => console.dir(response)} 
                  title="Log raw object to console"
                  style={{
                    background: '#ebf8ff',
                    border: '1px solid #bee3f8',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    color: '#2b6cb0'
                  }}>
                  🛠 Debug
                </button>
                
                {response.sql && <SqlToggle sql={response.sql} />}
                
              </div>
            </div>

            {/* NATURAL LANGUAGE RESPONSE */}
            <div style={{ 
              fontSize: '17px', 
              lineHeight: '1.6', 
              color: 'var(--text-main)',
              marginBottom: response.data ? '40px' : '0'
            }}>
              {response.answer}
            </div>

            {/* VISUALIZATION */}
            {response.chart_config && (
              <div style={{ marginBottom: '40px' }}>
                <div style={{ fontSize: '12px', color: 'var(--pbi-blue)', fontWeight: 700, marginBottom: '15px' }}>
                  DATA VISUALIZATION
                </div>
                <ChartRenderer data={response.data} config={response.chart_config} />
              </div>
            )}

            {/* DATA TABLE */}
            {response.data && response.data.length > 0 && (
              <div>
                <div style={{ fontSize: '12px', color: 'var(--pbi-blue)', fontWeight: 700, marginBottom: '15px' }}>
                  DETAILED RECORDS
                </div>
                <ResultsTable results={response.data} />
              </div>
            )}
          </div>
        </main>
      )}

      {/* REDUNDANT DEBUG PREVIEW (Optional, for development) */}
      {response && (
        <details style={{ marginTop: '40px', opacity: 0.3 }}>
          <summary style={{ fontSize: '10px', cursor: 'pointer' }}>Raw System Metadata</summary>
          <pre style={{ fontSize: '9px', background: '#eee', padding: '10px' }}>
            {JSON.stringify({ row_count: response.row_count, has_viz: !!response.chart_config }, null, 2)}
          </pre>
        </details>
      )}
    </div>
  )
}