import { useState } from 'react';

const API_BASE = '/api/flows';

const NODE_TYPES = [
  { type: 'hook-generator', label: 'Hook Generator', icon: '🪝', desc: 'Generate 5 hooks from a topic' },
  { type: 'script-writer', label: 'Script Writer', icon: '📝', desc: 'Write a short-form script' },
  { type: 'image-prompt', label: 'Image Prompt', icon: '🎨', desc: 'Create an image gen prompt' },
  { type: 'video-prompt', label: 'Video Prompt', icon: '🎬', desc: 'Create an LTX-2 video prompt' },
  { type: 'caption-writer', label: 'Caption Writer', icon: '✍️', desc: 'Write platform captions' },
  { type: 'repurpose-engine', label: 'Repurpose Engine', icon: '♻️', desc: 'Cut long-form into shorts' },
];

const TEMPLATES = [
  { name: 'Idea → Script', nodes: ['hook-generator', 'script-writer'] },
  { name: 'Hook Batch', nodes: ['hook-generator'] },
  { name: 'Visual Pack', nodes: ['image-prompt', 'video-prompt'] },
  { name: 'Repurpose Engine', nodes: ['repurpose-engine', 'caption-writer'] },
  { name: 'Full Campaign', nodes: ['hook-generator', 'script-writer', 'image-prompt', 'caption-writer'] },
];

export default function ContentFlow() {
  const [topic, setTopic] = useState('');
  const [activeNodes, setActiveNodes] = useState([]);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [flowName, setFlowName] = useState('');
  const [saved, setSaved] = useState(false);

  const addNode = (type) => {
    setActiveNodes(prev => [...prev, { id: Date.now(), type }]);
  };

  const removeNode = (id) => {
    setActiveNodes(prev => prev.filter(n => n.id !== id));
  };

  const loadTemplate = (template) => {
    setActiveNodes(template.nodes.map(type => ({ id: Date.now() + Math.random(), type })));
    setResults([]);
  };

  const runFlow = async () => {
    if (!topic.trim() || activeNodes.length === 0) return;
    setRunning(true); setError(''); setResults([]);
    try {
      const res = await fetch(`${API_BASE}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes: activeNodes, input: topic })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResults(data.results);
    } catch (e) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  };

  const saveFlow = async () => {
    if (!flowName.trim() || activeNodes.length === 0) return;
    try {
      const res = await fetch(`${API_BASE}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: flowName, nodes: activeNodes })
      });
      if (!res.ok) throw new Error('Save failed');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e.message);
    }
  };

  const s = {
    wrap: { minHeight: '100vh', background: '#0C0A07', color: '#E5E7EB', fontFamily: 'Sora, sans-serif', padding: '32px' },
    header: { marginBottom: '32px' },
    title: { fontSize: '24px', fontWeight: '700', color: '#F0A800', margin: '0 0 4px' },
    sub: { fontSize: '13px', color: '#6B7280', fontFamily: 'DM Mono, monospace' },
    grid: { display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px' },
    panel: { background: '#1A1614', border: '1px solid #2A2520', borderRadius: '12px', padding: '20px' },
    label: { fontSize: '11px', color: '#9CA3AF', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' },
    input: { width: '100%', background: '#0C0A07', border: '1px solid #2A2520', borderRadius: '8px', color: '#E5E7EB', padding: '10px 12px', fontSize: '14px', fontFamily: 'Sora, sans-serif', boxSizing: 'border-box' },
    nodeChip: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0C0A07', border: '1px solid #2A2520', borderRadius: '8px', padding: '10px 12px', marginBottom: '8px' },
    addBtn: { background: '#1A1614', border: '1px solid #F0A800', borderRadius: '6px', color: '#F0A800', padding: '6px 10px', fontSize: '12px', cursor: 'pointer', fontFamily: 'DM Mono, monospace' },
    runBtn: { background: 'linear-gradient(135deg, #F0A800, #D4953A)', border: 'none', borderRadius: '10px', color: '#0C0A07', padding: '12px 24px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', width: '100%', marginTop: '16px', fontFamily: 'Sora, sans-serif' },
    resultCard: { background: '#0C0A07', border: '1px solid #2A2520', borderRadius: '10px', padding: '16px', marginBottom: '12px' },
    resultLabel: { fontSize: '11px', color: '#F0A800', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', marginBottom: '8px' },
    resultText: { fontSize: '13px', color: '#D1D5DB', fontFamily: 'Sora, sans-serif', lineHeight: '1.7', whiteSpace: 'pre-wrap', margin: 0 },
    templateBtn: { background: '#0C0A07', border: '1px solid #2A2520', borderRadius: '6px', color: '#9CA3AF', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', marginRight: '8px', marginBottom: '8px', fontFamily: 'DM Mono, monospace' },
    removeBtn: { background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', fontSize: '16px', padding: '0 4px' },
    saveRow: { display: 'flex', gap: '8px', marginTop: '12px' },
    saveInput: { flex: 1, background: '#0C0A07', border: '1px solid #2A2520', borderRadius: '8px', color: '#E5E7EB', padding: '8px 12px', fontSize: '13px', fontFamily: 'Sora, sans-serif' },
    saveBtn: { background: saved ? '#059669' : '#2A2520', border: 'none', borderRadius: '8px', color: saved ? '#fff' : '#9CA3AF', padding: '8px 16px', fontSize: '13px', cursor: 'pointer', fontFamily: 'DM Mono, monospace' },
  };

  return (
    <div style={s.wrap}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=DM+Mono:wght@400;500&display=swap'); * { box-sizing: border-box; }`}</style>

      <div style={s.header}>
        <h1 style={s.title}>Content Flow</h1>
        <p style={s.sub}>Build repeatable AI workflows — run any content pipeline with one click</p>
      </div>

      <div style={s.grid}>
        <div>
          <div style={{ ...s.panel, marginBottom: '16px' }}>
            <div style={s.label}>Topic / Idea</div>
            <textarea
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="e.g. 5 morning habits that changed my life..."
              rows={3}
              style={{ ...s.input, resize: 'vertical' }}
            />
          </div>

          <div style={{ ...s.panel, marginBottom: '16px' }}>
            <div style={s.label}>Quick Templates</div>
            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
              {TEMPLATES.map(t => (
                <button key={t.name} style={s.templateBtn} onClick={() => loadTemplate(t)}>
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          <div style={{ ...s.panel, marginBottom: '16px' }}>
            <div style={s.label}>Add Steps</div>
            {NODE_TYPES.map(n => (
              <div key={n.type} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div>
                  <span style={{ marginRight: '8px' }}>{n.icon}</span>
                  <span style={{ fontSize: '13px', color: '#E5E7EB' }}>{n.label}</span>
                  <div style={{ fontSize: '11px', color: '#6B7280', fontFamily: 'DM Mono, monospace', marginLeft: '24px' }}>{n.desc}</div>
                </div>
                <button style={s.addBtn} onClick={() => addNode(n.type)}>+ Add</button>
              </div>
            ))}
          </div>

          {activeNodes.length > 0 && (
            <div style={s.panel}>
              <div style={s.label}>Your Flow ({activeNodes.length} steps)</div>
              {activeNodes.map((node, i) => {
                const def = NODE_TYPES.find(n => n.type === node.type);
                return (
                  <div key={node.id} style={s.nodeChip}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '11px', color: '#F0A800', fontFamily: 'DM Mono, monospace' }}>{i + 1}</span>
                      <span style={{ fontSize: '13px' }}>{def?.icon} {def?.label}</span>
                    </div>
                    <button style={s.removeBtn} onClick={() => removeNode(node.id)}>×</button>
                  </div>
                );
              })}

              <button
                onClick={runFlow}
                disabled={running || !topic.trim()}
                style={{ ...s.runBtn, opacity: running || !topic.trim() ? 0.6 : 1 }}
              >
                {running ? '⟳ Running Flow...' : '▶ Run Flow'}
              </button>

              <div style={s.saveRow}>
                <input
                  value={flowName}
                  onChange={e => setFlowName(e.target.value)}
                  placeholder="Name this flow to save it..."
                  style={s.saveInput}
                />
                <button onClick={saveFlow} style={s.saveBtn}>
                  {saved ? '✓ Saved' : 'Save'}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div style={{ background: '#1F0A0A', border: '1px solid #7F1D1D', borderRadius: '8px', padding: '12px', color: '#FCA5A5', fontSize: '13px', marginTop: '12px', fontFamily: 'DM Mono, monospace' }}>
              {error}
            </div>
          )}
        </div>

        <div style={s.panel}>
          {results.length > 0 ? (
            <>
              <div style={s.label}>Flow Results</div>
              {results.map((r, i) => {
                const def = NODE_TYPES.find(n => n.type === r.type);
                let display = r.output;
                try { display = JSON.stringify(JSON.parse(r.output), null, 2); } catch {}
                return (
                  <div key={i} style={s.resultCard}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div style={s.resultLabel}>{def?.icon} {def?.label}</div>
                      <button
                        onClick={() => navigator.clipboard.writeText(r.output)}
                        style={{ background: 'none', border: '1px solid #2A2520', borderRadius: '4px', color: '#6B7280', padding: '3px 8px', fontSize: '11px', cursor: 'pointer', fontFamily: 'DM Mono, monospace' }}
                      >
                        Copy
                      </button>
                    </div>
                    <pre style={s.resultText}>{display}</pre>
                  </div>
                );
              })}
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '12px' }}>
              {running ? (
                <>
                  <div style={{ width: '40px', height: '40px', border: '3px solid #F0A800', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  <div style={{ color: '#F0A800', fontSize: '14px' }}>Running your flow...</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: '48px' }}>⚡</div>
                  <div style={{ color: '#4B5563', fontSize: '14px' }}>Build a flow and hit Run</div>
                  <div style={{ color: '#374151', fontSize: '12px', fontFamily: 'DM Mono, monospace' }}>Results appear here step by step</div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
