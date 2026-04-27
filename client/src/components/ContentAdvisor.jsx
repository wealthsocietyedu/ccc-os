import { useState, useRef, useEffect, useCallback } from 'react';

const API_ADVISOR = '/api/advisor';
const API_IMPORT = '/api/csv-import';

function getToken() {
  return localStorage.getItem('ccc_token') || '';
}

async function apiFetch(base, endpoint, body, method = 'POST') {
  const res = await fetch(`${base}${endpoint}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

async function uploadFile(endpoint, file, fields = {}) {
  const form = new FormData();
  form.append('file', file);
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  const res = await fetch(`${API_IMPORT}${endpoint}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${getToken()}` },
    body: form
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data;
}

// ─── SHARED UI ────────────────────────────────────────────────────────────────

const S = {
  panel: { background: '#1A1A2E', border: '1px solid #2D2D44', borderRadius: '12px', padding: '20px' },
  innerCard: { background: '#0A0A1F', border: '1px solid #2D2D44', borderRadius: '10px', padding: '16px' },
  label: { fontSize: '11px', color: '#9CA3AF', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' },
  input: { background: '#0D0D1A', border: '1px solid #2D2D44', borderRadius: '8px', color: '#E5E7EB', padding: '10px 12px', fontSize: '14px', fontFamily: 'Sora, sans-serif', outline: 'none', width: '100%', boxSizing: 'border-box' },
};

function TabBtn({ active, onClick, label, icon }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontFamily: 'Sora, sans-serif', fontWeight: active ? '600' : '400', background: active ? '#F0A800' : 'transparent', color: active ? '#0C0A07' : '#9CA3AF', transition: 'all 0.2s', whiteSpace: 'nowrap' }}>
      <span style={{ fontSize: '14px' }}>{icon}</span>{label}
    </button>
  );
}

function Btn({ onClick, loading, label, icon, variant = 'primary', disabled, style = {} }) {
  const isPrimary = variant === 'primary';
  return (
    <button onClick={onClick} disabled={loading || disabled} style={{ background: loading || disabled ? '#2D2D44' : isPrimary ? '#F0A800' : '#1A1A2E', border: isPrimary ? 'none' : '1px solid #2D2D44', borderRadius: '9px', color: isPrimary ? '#0C0A07' : '#E5E7EB', padding: '10px 18px', fontSize: '14px', fontWeight: '600', fontFamily: 'Sora, sans-serif', cursor: loading || disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '7px', transition: 'all 0.2s', opacity: loading || disabled ? 0.6 : 1, ...style }}>
      <span>{loading ? '⟳' : icon}</span>{loading ? 'Working...' : label}
    </button>
  );
}

function CopyBtn({ text }) {
  const [c, setC] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setC(true); setTimeout(() => setC(false), 2000); }} style={{ background: c ? '#059669' : '#2D2D44', border: 'none', borderRadius: '6px', color: '#fff', padding: '5px 11px', fontSize: '12px', fontFamily: 'DM Mono, monospace', cursor: 'pointer' }}>
      {c ? '✓' : 'Copy'}
    </button>
  );
}

function Err({ msg }) {
  if (!msg) return null;
  return <div style={{ background: '#1F0A0A', border: '1px solid #7F1D1D', borderRadius: '8px', padding: '10px 14px', color: '#FCA5A5', fontSize: '13px', fontFamily: 'DM Mono, monospace' }}>{msg}</div>;
}

function StatCard({ label, value, sub, color = '#F0A800' }) {
  return (
    <div style={{ ...S.panel, padding: '14px', textAlign: 'center' }}>
      <div style={{ fontSize: '11px', color: '#6B7280', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '22px', fontWeight: '700', color, fontFamily: 'Sora, sans-serif' }}>{value}</div>
      {sub && <div style={{ fontSize: '11px', color: '#4B5563', fontFamily: 'DM Mono, monospace', marginTop: '3px' }}>{sub}</div>}
    </div>
  );
}

function OutputBlock({ title, content, accentColor = '#F0A800' }) {
  return (
    <div style={S.innerCard}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span style={{ fontSize: '11px', color: accentColor, fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{title}</span>
        <CopyBtn text={content} />
      </div>
      <div style={{ color: '#E5E7EB', fontSize: '14px', fontFamily: 'Sora, sans-serif', lineHeight: '1.75', whiteSpace: 'pre-wrap' }}>{content}</div>
    </div>
  );
}

// ─── TAB 1: IMPORT ────────────────────────────────────────────────────────────

function ImportTab({ onImportDone }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [brandId, setBrandId] = useState('');
  const [brands, setBrands] = useState([]);
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importStatus, setImportStatus] = useState(null);
  const [error, setError] = useState('');
  const fileRef = useRef();

  useEffect(() => {
    apiFetch('/api', '/brands', undefined, 'GET')
      .then(d => { setBrands(d.brands || d || []); if (d.brands?.[0]) setBrandId(d.brands[0].id); })
      .catch(() => {});
    apiFetch(API_IMPORT, '/status', undefined, 'GET')
      .then(d => setImportStatus(d))
      .catch(() => {});
  }, []);

  const handleFileChange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f); setPreview(null); setImportResult(null); setError('');
    setPreviewing(true);
    try {
      const data = await uploadFile('/preview', f);
      setPreview(data);
    } catch (err) { setError(err.message); }
    finally { setPreviewing(false); }
  };

  const handleImport = async () => {
    if (!file || !brandId) return;
    setImporting(true); setError(''); setImportResult(null);
    try {
      const data = await uploadFile('/import', file, { brandId, platformOverride: preview?.platformKey || '' });
      setImportResult(data);
      if (data.imported > 0) {
        const status = await apiFetch(API_IMPORT, '/status', undefined, 'GET');
        setImportStatus(status);
        onImportDone();
      }
    } catch (err) { setError(err.message); }
    finally { setImporting(false); }
  };

  const PLATFORM_GUIDES = [
    { name: 'Instagram', icon: '📸', steps: 'Go to Meta Business Suite → Insights → Content tab → Export data → Select date range → Download CSV' },
    { name: 'YouTube', icon: '▶️', steps: 'YouTube Studio → Analytics → Reach or Engagement tab → Export current view as CSV (top right)' },
    { name: 'TikTok', icon: '🎵', steps: 'TikTok Studio → Analytics → Content tab → Click export icon (top right) → Download CSV' },
    { name: 'X (Twitter)', icon: '𝕏', steps: 'analytics.twitter.com → Tweets tab → Export data → This month → Export' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Current data status */}
      {importStatus && (
        <div style={{ ...S.panel, padding: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '16px' }}>{importStatus.hasData ? '✅' : '○'}</span>
              <div>
                <div style={{ fontSize: '13px', color: '#E5E7EB', fontFamily: 'Sora, sans-serif', fontWeight: '600' }}>
                  {importStatus.hasData ? `${importStatus.total} posts imported` : 'No data yet — import your first CSV'}
                </div>
                {importStatus.hasData && (
                  <div style={{ fontSize: '11px', color: '#6B7280', fontFamily: 'DM Mono, monospace', marginTop: '2px' }}>
                    {importStatus.byPlatform.map(p => `${p.platform}: ${p.posts}`).join(' · ')}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* How to export guides */}
      <div style={{ ...S.panel }}>
        <div style={S.label}>How to export your analytics CSV</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '10px' }}>
          {PLATFORM_GUIDES.map(p => (
            <div key={p.name} style={{ background: '#0D0D1A', borderRadius: '8px', padding: '12px', border: '1px solid #2D2D44' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '6px' }}>
                <span style={{ fontSize: '16px' }}>{p.icon}</span>
                <span style={{ fontSize: '13px', color: '#E5E7EB', fontFamily: 'Sora, sans-serif', fontWeight: '600' }}>{p.name}</span>
              </div>
              <div style={{ fontSize: '11px', color: '#6B7280', fontFamily: 'DM Mono, monospace', lineHeight: '1.6' }}>{p.steps}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Upload area */}
      <div style={S.panel}>
        <div style={S.label}>Upload CSV</div>

        {/* Brand selector */}
        {brands.length > 0 && (
          <div style={{ marginBottom: '14px' }}>
            <div style={{ ...S.label, marginBottom: '6px' }}>Brand</div>
            <select value={brandId} onChange={e => setBrandId(e.target.value)} style={{ ...S.input, appearance: 'none' }}>
              {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        )}

        {/* Drop zone */}
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { fileRef.current.files = e.dataTransfer.files; handleFileChange({ target: { files: e.dataTransfer.files } }); } }}
          style={{ border: '2px dashed #2D2D44', borderRadius: '10px', padding: '32px', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s', background: '#0D0D1A' }}
        >
          <div style={{ fontSize: '32px', marginBottom: '10px' }}>📁</div>
          <div style={{ fontSize: '14px', color: '#E5E7EB', fontFamily: 'Sora, sans-serif', marginBottom: '4px' }}>
            {file ? file.name : 'Drop your CSV here or click to browse'}
          </div>
          <div style={{ fontSize: '12px', color: '#4B5563', fontFamily: 'DM Mono, monospace' }}>
            Instagram · YouTube · TikTok · X · Any CSV with post metrics
          </div>
          <input ref={fileRef} type="file" accept=".csv" onChange={handleFileChange} style={{ display: 'none' }} />
        </div>

        {previewing && <div style={{ color: '#F0A800', fontSize: '13px', fontFamily: 'DM Mono, monospace', marginTop: '10px' }}>⟳ Reading CSV...</div>}
        <Err msg={error} />

        {/* Preview */}
        {preview && (
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: '#0A1A0A', border: '1px solid #1A3A1A', borderRadius: '8px' }}>
              <span style={{ fontSize: '18px' }}>✅</span>
              <div>
                <div style={{ fontSize: '13px', color: '#4ADE80', fontFamily: 'Sora, sans-serif', fontWeight: '600' }}>Detected: {preview.detectedPlatform}</div>
                <div style={{ fontSize: '11px', color: '#6B7280', fontFamily: 'DM Mono, monospace' }}>{preview.totalRows} rows found</div>
              </div>
            </div>

            {/* Column mapping preview */}
            <div style={{ background: '#0D0D1A', border: '1px solid #2D2D44', borderRadius: '8px', padding: '12px' }}>
              <div style={{ ...S.label, marginBottom: '8px' }}>Column Mapping</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                {Object.entries(preview.columnMapping).map(([field, col]) => (
                  <div key={field} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: col ? '#4ADE80' : '#4B5563', fontFamily: 'DM Mono, monospace' }}>{col ? '✓' : '○'}</span>
                    <span style={{ fontSize: '11px', color: '#6B7280', fontFamily: 'DM Mono, monospace' }}>{field}</span>
                    {col && <span style={{ fontSize: '11px', color: '#9CA3AF', fontFamily: 'DM Mono, monospace' }}>→ {col}</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Sample row */}
            {preview.sample?.[0] && (
              <div style={{ background: '#0D0D1A', border: '1px solid #2D2D44', borderRadius: '8px', padding: '12px' }}>
                <div style={{ ...S.label, marginBottom: '8px' }}>Sample Row</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                  {Object.entries(preview.sample[0]).filter(([,v]) => v !== null).map(([k, v]) => (
                    <div key={k} style={{ fontSize: '11px', fontFamily: 'DM Mono, monospace' }}>
                      <span style={{ color: '#6B7280' }}>{k}: </span>
                      <span style={{ color: '#E5E7EB' }}>{String(v).slice(0, 30)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Btn onClick={handleImport} loading={importing} label={`Import ${preview.totalRows} Posts`} icon="→" disabled={!brandId} />
          </div>
        )}

        {/* Import result */}
        {importResult && (
          <div style={{ marginTop: '14px', padding: '14px', background: importResult.imported > 0 ? '#0A1A0A' : '#1F0A0A', border: `1px solid ${importResult.imported > 0 ? '#1A3A1A' : '#7F1D1D'}`, borderRadius: '8px' }}>
            <div style={{ fontSize: '14px', color: importResult.imported > 0 ? '#4ADE80' : '#FCA5A5', fontFamily: 'Sora, sans-serif', fontWeight: '600', marginBottom: '4px' }}>
              {importResult.imported > 0 ? `✅ ${importResult.imported} posts imported from ${importResult.platform}` : '⚠️ No posts imported'}
            </div>
            <div style={{ fontSize: '12px', color: '#6B7280', fontFamily: 'DM Mono, monospace' }}>{importResult.message}</div>
            {importResult.imported > 0 && (
              <div style={{ marginTop: '10px', fontSize: '13px', color: '#4ADE80', fontFamily: 'Sora, sans-serif' }}>
                → Switch to the Analyze tab to get your AI analysis
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TAB 2: ANALYZE ───────────────────────────────────────────────────────────

function AnalyzeTab() {
  const [period, setPeriod] = useState('30');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const run = async () => {
    setLoading(true); setError(''); setResult(null);
    try { setResult(await apiFetch(API_ADVISOR, '/analyze', { period: parseInt(period) })); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ ...S.panel, display: 'flex', alignItems: 'center', gap: '16px' }}>
        <select value={period} onChange={e => setPeriod(e.target.value)} style={{ ...S.input, width: '180px', appearance: 'none' }}>
          {[['7','Last 7 days'],['14','Last 14 days'],['30','Last 30 days'],['90','Last 90 days']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <Btn onClick={run} loading={loading} label="Run Analysis" icon="◎" />
        <Err msg={error} />
      </div>

      {!result && !loading && (
        <div style={{ ...S.panel, minHeight: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <span style={{ fontSize: '32px' }}>◎</span>
          <div style={{ color: '#6B7280', fontSize: '14px', fontFamily: 'Sora, sans-serif', textAlign: 'center' }}>
            Import your CSV first, then run analysis to get real insights
          </div>
        </div>
      )}

      {result && !result.hasData && (
        <div style={{ ...S.panel, textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>📊</div>
          <div style={{ color: '#E5E7EB', fontSize: '15px', fontFamily: 'Sora, sans-serif', marginBottom: '8px' }}>No performance data yet</div>
          <div style={{ color: '#6B7280', fontSize: '13px', fontFamily: 'Sora, sans-serif' }}>Import a CSV from Instagram, YouTube, TikTok, or X to get started.</div>
        </div>
      )}

      {result?.hasData && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            <StatCard label="Posts" value={result.stats.totalPosts} />
            <StatCard label="Views" value={(result.stats.totalViews || 0).toLocaleString()} />
            <StatCard label="Leads" value={result.stats.totalLeads} />
            <StatCard label="Eng. Rate" value={`${result.stats.engagementRate}%`} />
          </div>
          <OutputBlock title="AI Analysis" content={result.analysis} />
          {result.top3?.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={S.panel}>
                <div style={{ ...S.label, color: '#3D9E8C', marginBottom: '12px' }}>✦ Top Performers</div>
                {result.top3.map((p, i) => (
                  <div key={i} style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: i < 2 ? '1px solid #2D2D44' : 'none' }}>
                    <div style={{ fontSize: '13px', color: '#E5E7EB', fontFamily: 'Sora, sans-serif', marginBottom: '3px' }}>{p.title}</div>
                    <div style={{ fontSize: '11px', color: '#6B7280', fontFamily: 'DM Mono, monospace' }}>{p.platform} · {(p.views||0).toLocaleString()} views · {p.leads||0} leads</div>
                  </div>
                ))}
              </div>
              <div style={S.panel}>
                <div style={{ ...S.label, color: '#EF4444', marginBottom: '12px' }}>↓ Needs Work</div>
                {result.bottom3.map((p, i) => (
                  <div key={i} style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: i < 2 ? '1px solid #2D2D44' : 'none' }}>
                    <div style={{ fontSize: '13px', color: '#E5E7EB', fontFamily: 'Sora, sans-serif', marginBottom: '3px' }}>{p.title}</div>
                    <div style={{ fontSize: '11px', color: '#6B7280', fontFamily: 'DM Mono, monospace' }}>{p.platform} · {(p.views||0).toLocaleString()} views</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── TAB 3: WRITE ─────────────────────────────────────────────────────────────

function WriteTab() {
  const [topic, setTopic] = useState('');
  const [format, setFormat] = useState('Short Form Video');
  const [platform, setPlatform] = useState('Instagram');
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [variations, setVariations] = useState('');
  const [savedVoice, setSavedVoice] = useState(false);
  const [error, setError] = useState('');

  const generate = async () => {
    if (!topic.trim()) return;
    setLoading(true); setError(''); setDraft(''); setVariations('');
    try { setDraft((await apiFetch(API_ADVISOR, '/draft', { topic, format, platform })).draft); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const enhance = async () => {
    setEnhancing(true); setError('');
    try { setDraft((await apiFetch(API_ADVISOR, '/enhance', { draft })).enhanced); }
    catch (e) { setError(e.message); }
    finally { setEnhancing(false); }
  };

  const getVariations = async () => {
    setLoading(true); setError('');
    try { setVariations((await apiFetch(API_ADVISOR, '/variations', { draft, platform })).variations); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const saveVoice = async () => {
    try { await apiFetch(API_ADVISOR, '/save-voice-sample', { content: draft }); setSavedVoice(true); setTimeout(() => setSavedVoice(false), 3000); }
    catch (e) { setError(e.message); }
  };

  const formats = [['Short Form Video','📱 Short Form Video'],['Thread','🧵 Thread'],['Carousel','🎠 Carousel'],['Long Form Video','▶️ Long Form Video'],['Static Post','📝 Static Post']];
  const platforms = ['Instagram','X (Twitter)','YouTube','TikTok','LinkedIn'];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={S.label}>Topic or Idea</div>
          <textarea value={topic} onChange={e => setTopic(e.target.value)} placeholder="What do you want to create content about?" rows={4} style={{ ...S.input, resize: 'vertical' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={S.label}>Format</div>
          <select value={format} onChange={e => setFormat(e.target.value)} style={{ ...S.input, appearance: 'none' }}>
            {formats.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={S.label}>Platform</div>
          <select value={platform} onChange={e => setPlatform(e.target.value)} style={{ ...S.input, appearance: 'none' }}>
            {platforms.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <Btn onClick={generate} loading={loading} label="Write Draft" icon="✦" disabled={!topic.trim()} />
        <Err msg={error} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {draft ? (
          <>
            <div style={S.innerCard}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', color: '#F0A800', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase' }}>✦ Your Draft</span>
                <CopyBtn text={draft} />
              </div>
              <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={10} style={{ ...S.input, background: 'transparent', border: 'none', resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <Btn onClick={enhance} loading={enhancing} label="Enhance" icon="↑" variant="secondary" />
              <Btn onClick={getVariations} loading={loading} label="3 Hook Variations" icon="⊞" variant="secondary" />
              <button onClick={saveVoice} style={{ background: savedVoice ? '#059669' : '#1A1A2E', border: '1px solid #2D2D44', borderRadius: '9px', color: savedVoice ? '#fff' : '#9CA3AF', padding: '10px 16px', fontSize: '13px', cursor: 'pointer', fontFamily: 'Sora, sans-serif', transition: 'all 0.2s' }}>
                {savedVoice ? '✓ Saved as voice sample' : '♡ This sounds like me'}
              </button>
            </div>
            {variations && <OutputBlock title="3 Hook Variations" content={variations} />}
          </>
        ) : (
          <div style={{ ...S.panel, minHeight: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            {loading ? (
              <>
                <div style={{ width: '36px', height: '36px', border: '3px solid #F0A800', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <div style={{ color: '#F0A800', fontSize: '14px', fontFamily: 'Sora, sans-serif' }}>Writing in your voice...</div>
              </>
            ) : (
              <>
                <span style={{ fontSize: '32px' }}>✦</span>
                <div style={{ color: '#6B7280', fontSize: '14px', fontFamily: 'Sora, sans-serif', textAlign: 'center' }}>Enter a topic and generate your draft</div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TAB 4: INTERVIEW ─────────────────────────────────────────────────────────

function InterviewTab() {
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isWrapping, setIsWrapping] = useState(false);
  const [ideas, setIdeas] = useState([]);
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [error, setError] = useState('');
  const bottomRef = useRef();

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const start = async () => {
    setLoading(true); setError(''); setMessages([]); setIdeas([]); setSavedCount(0);
    try {
      const d = await apiFetch(API_ADVISOR, '/interview', { isStart: true });
      setSessionId(d.sessionId);
      setMessages([{ role: 'assistant', content: d.response }]);
      setStarted(true);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const send = async () => {
    if (!input.trim() || loading) return;
    const msg = input.trim(); setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setLoading(true);
    try {
      const d = await apiFetch(API_ADVISOR, '/interview', { sessionId, userMessage: msg });
      setMessages(prev => [...prev, { role: 'assistant', content: d.response }]);
      if (d.isWrapping) {
        setIsWrapping(true);
        const lines = d.response.split('\n').filter(l => /^\d+\./.test(l.trim()));
        setIdeas(lines.map(l => {
          const m = l.match(/^\d+\.\s*(.+?)(?:\s*—\s*Format:\s*(.+?))?(?:\s*—\s*Hook:\s*(.+))?$/);
          return { title: m?.[1]?.trim() || l.replace(/^\d+\.\s*/,'').split('—')[0].trim(), format: m?.[2]?.trim() || 'Short Form Video', hookAngle: m?.[3]?.trim() || '', selected: true };
        }).filter(i => i.title));
      }
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const saveIdeas = async () => {
    setSaving(true);
    try {
      const d = await apiFetch(API_ADVISOR, '/interview/save-ideas', { ideas: ideas.filter(i => i.selected) });
      setSavedCount(d.count); setIdeas([]);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  if (!started) {
    return (
      <div style={{ ...S.panel, minHeight: '380px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', textAlign: 'center' }}>
        <span style={{ fontSize: '44px' }}>🎙️</span>
        <div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#fff', fontFamily: 'Sora, sans-serif', marginBottom: '6px' }}>Interview Me</div>
          <div style={{ fontSize: '13px', color: '#6B7280', fontFamily: 'Sora, sans-serif', lineHeight: '1.7', maxWidth: '380px' }}>
            The Advisor interviews you like a podcast host. 6-8 questions. Your answers become a list of content ideas saved to your Idea Vault.
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '320px' }}>
          {['Extracts ideas you didn\'t know you had','One focused question at a time','5+ ready-to-use content ideas','Auto-saves to your Idea Vault'].map((f,i) => (
            <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'center', background: '#1A1A2E', borderRadius: '8px', padding: '9px 12px' }}>
              <span style={{ color: '#F0A800', fontSize: '13px', flexShrink: 0 }}>✦</span>
              <span style={{ fontSize: '12px', color: '#9CA3AF', fontFamily: 'Sora, sans-serif' }}>{f}</span>
            </div>
          ))}
        </div>
        <Btn onClick={start} loading={loading} label="Start Interview" icon="🎙️" />
        <Err msg={error} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ ...S.panel, maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', gap: '10px', flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0, background: m.role === 'user' ? '#2D2D44' : '#F0A800', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: m.role === 'user' ? '#E5E7EB' : '#0C0A07', fontWeight: '700' }}>
              {m.role === 'user' ? 'U' : '✦'}
            </div>
            <div style={{ background: m.role === 'user' ? '#1A1A2E' : '#0A0A1F', border: '1px solid #2D2D44', borderRadius: '10px', padding: '10px 14px', maxWidth: '82%', fontSize: '14px', color: '#E5E7EB', fontFamily: 'Sora, sans-serif', lineHeight: '1.65', whiteSpace: 'pre-wrap' }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && <div style={{ color: '#6B7280', fontSize: '12px', fontFamily: 'DM Mono, monospace', marginLeft: '38px' }}>✦ thinking...</div>}
        <div ref={bottomRef} />
      </div>

      {ideas.length > 0 && (
        <div style={{ ...S.panel, border: '1px solid #F0A800' }}>
          <div style={{ ...S.label, color: '#F0A800', marginBottom: '10px' }}>✦ Ideas Extracted — Select to Save</div>
          {ideas.map((idea, i) => (
            <div key={i} onClick={() => setIdeas(prev => prev.map((p,j) => j===i ? {...p,selected:!p.selected} : p))}
              style={{ display: 'flex', gap: '10px', padding: '9px 12px', background: idea.selected ? '#0A1A0A' : '#1A1A2E', border: `1px solid ${idea.selected ? '#3D9E8C' : '#2D2D44'}`, borderRadius: '8px', cursor: 'pointer', marginBottom: '7px', transition: 'all 0.15s' }}>
              <span style={{ color: idea.selected ? '#3D9E8C' : '#6B7280', flexShrink: 0, marginTop: '2px' }}>{idea.selected ? '✓' : '○'}</span>
              <div>
                <div style={{ fontSize: '13px', color: '#E5E7EB', fontFamily: 'Sora, sans-serif', fontWeight: '500' }}>{idea.title}</div>
                <div style={{ fontSize: '11px', color: '#6B7280', fontFamily: 'DM Mono, monospace', marginTop: '2px' }}>{idea.format}</div>
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px', alignItems: 'center' }}>
            <Btn onClick={saveIdeas} loading={saving} label={`Save ${ideas.filter(i=>i.selected).length} to Idea Vault`} icon="→" />
            {savedCount > 0 && <span style={{ color: '#4ADE80', fontSize: '13px', fontFamily: 'DM Mono, monospace' }}>✓ {savedCount} saved!</span>}
          </div>
          <Err msg={error} />
        </div>
      )}

      {!isWrapping && (
        <div style={{ display: 'flex', gap: '10px' }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()} placeholder="Your answer..." disabled={loading} style={{ ...S.input, flex: 1 }} />
          <Btn onClick={send} loading={loading} label="Send" icon="→" disabled={!input.trim()} />
        </div>
      )}
    </div>
  );
}

// ─── TAB 5: WEEKLY REVIEW ─────────────────────────────────────────────────────

function WeeklyReviewTab() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const run = async () => {
    setLoading(true); setError(''); setResult(null);
    try { setResult(await apiFetch(API_ADVISOR, '/weekly-review', {})); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const delta = (a, b) => { if (!b) return ''; const p = Math.round(((a-b)/b)*100); return p > 0 ? `+${p}%` : `${p}%`; };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ ...S.panel, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '14px', color: '#E5E7EB', fontFamily: 'Sora, sans-serif', fontWeight: '600' }}>Weekly Content Review</div>
          <div style={{ fontSize: '12px', color: '#6B7280', fontFamily: 'DM Mono, monospace', marginTop: '2px' }}>This week vs last week. Run every Sunday.</div>
        </div>
        <Btn onClick={run} loading={loading} label="Run Review" icon="↻" />
      </div>
      <Err msg={error} />

      {result && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            {[['Posts', result.thisWeek.posts, result.lastWeek.posts],['Views', result.thisWeek.views, result.lastWeek.views],['Leads', result.thisWeek.leads, result.lastWeek.leads],['Followers', result.thisWeek.followers, result.lastWeek.followers]].map(([label, thisVal, lastVal]) => (
              <StatCard key={label} label={label} value={(thisVal||0).toLocaleString()} sub={delta(thisVal,lastVal) ? `${delta(thisVal,lastVal)} vs last week` : undefined} color={thisVal >= lastVal ? '#F0A800' : '#EF4444'} />
            ))}
          </div>
          <OutputBlock title={`AI Review — Week of ${result.weekOf}`} content={result.review} />
          {result.topPosts?.length > 0 && (
            <div style={S.panel}>
              <div style={{ ...S.label, marginBottom: '12px' }}>Top Posts This Week</div>
              {result.topPosts.map((p,i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < result.topPosts.length-1 ? '1px solid #2D2D44' : 'none' }}>
                  <div>
                    <div style={{ fontSize: '13px', color: '#E5E7EB', fontFamily: 'Sora, sans-serif' }}>{p.title}</div>
                    <div style={{ fontSize: '11px', color: '#6B7280', fontFamily: 'DM Mono, monospace', marginTop: '2px' }}>{p.platform}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '13px', color: '#F0A800', fontFamily: 'DM Mono, monospace' }}>{(p.views||0).toLocaleString()} views</div>
                    <div style={{ fontSize: '11px', color: '#4ADE80', fontFamily: 'DM Mono, monospace' }}>{p.leads||0} leads</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {!result && !loading && (
        <div style={{ ...S.panel, minHeight: '160px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <span style={{ fontSize: '28px' }}>↻</span>
          <div style={{ color: '#6B7280', fontSize: '14px', fontFamily: 'Sora, sans-serif' }}>Run your weekly review to see what moved this week</div>
        </div>
      )}
    </div>
  );
}

// ─── CHAT BUBBLE ──────────────────────────────────────────────────────────────

function ChatBubble() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const bottomRef = useRef();

  useEffect(() => { if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, open]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const msg = input.trim(); setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setLoading(true);
    try {
      const d = await apiFetch(API_ADVISOR, '/chat', { message: msg, sessionId });
      if (!sessionId) setSessionId(d.sessionId);
      setMessages(prev => [...prev, { role: 'assistant', content: d.response }]);
    } catch (e) { setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${e.message}` }]); }
    finally { setLoading(false); }
  };

  if (!open) return (
    <button onClick={() => setOpen(true)} style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000, width: '50px', height: '50px', borderRadius: '50%', background: '#F0A800', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: '#0C0A07', boxShadow: '0 4px 20px rgba(240,168,0,0.4)' }}>
      ✦
    </button>
  );

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000, width: '340px', background: '#0D0D1A', border: '1px solid #2D2D44', borderRadius: '14px', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 40px rgba(0,0,0,0.6)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#1A1A2E', borderBottom: '1px solid #2D2D44' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#F0A800', fontSize: '15px' }}>✦</span>
          <span style={{ fontSize: '13px', color: '#E5E7EB', fontFamily: 'Sora, sans-serif', fontWeight: '600' }}>Content Advisor</span>
          <span style={{ fontSize: '10px', color: '#4ADE80', background: '#0A1A0A', padding: '2px 7px', borderRadius: '10px', fontFamily: 'DM Mono, monospace' }}>Online</span>
        </div>
        <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}>×</button>
      </div>
      <div style={{ height: '300px', overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {!messages.length && <div style={{ color: '#4B5563', fontSize: '13px', fontFamily: 'Sora, sans-serif', textAlign: 'center', marginTop: '60px' }}>Ask me anything about your content strategy.</div>}
        {messages.map((m,i) => (
          <div key={i} style={{ display: 'flex', gap: '8px', flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0, background: m.role === 'user' ? '#2D2D44' : '#F0A800', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: m.role === 'user' ? '#E5E7EB' : '#0C0A07', fontWeight: '700' }}>
              {m.role === 'user' ? 'U' : '✦'}
            </div>
            <div style={{ background: m.role === 'user' ? '#1A1A2E' : '#0A0A1F', border: '1px solid #2D2D44', borderRadius: '8px', padding: '8px 11px', maxWidth: '85%', fontSize: '13px', color: '#E5E7EB', fontFamily: 'Sora, sans-serif', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && <div style={{ color: '#6B7280', fontSize: '11px', fontFamily: 'DM Mono, monospace' }}>✦ thinking...</div>}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding: '10px 14px', borderTop: '1px solid #2D2D44', display: 'flex', gap: '8px' }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()} placeholder="Ask your advisor..." disabled={loading} style={{ ...S.input, flex: 1, padding: '8px 10px', fontSize: '13px' }} />
        <button onClick={send} disabled={loading || !input.trim()} style={{ background: '#F0A800', border: 'none', borderRadius: '7px', color: '#0C0A07', padding: '8px 12px', fontSize: '14px', cursor: 'pointer', fontWeight: '700' }}>→</button>
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export default function ContentAdvisor() {
  const [activeTab, setActiveTab] = useState('import');
  const [dataRefresh, setDataRefresh] = useState(0);

  const tabs = [
    { id: 'import', icon: '↑', label: 'Import Data' },
    { id: 'analyze', icon: '◎', label: 'Analyze' },
    { id: 'write', icon: '✦', label: 'Write' },
    { id: 'interview', icon: '🎙️', label: 'Interview' },
    { id: 'review', icon: '↻', label: 'Weekly Review' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D1A', color: '#E5E7EB', fontFamily: 'Sora, sans-serif', padding: '32px' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300;1,400&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: #2D2D44; border-radius: 3px; }
        select option { background: #1A1A2E; color: #E5E7EB; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '6px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '11px', background: '#F0A800', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: '#0C0A07', boxShadow: '0 0 20px rgba(240,168,0,0.3)' }}>✦</div>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: '#fff', letterSpacing: '-0.02em' }}>Content Advisor</h1>
            <p style={{ margin: 0, fontSize: '12px', color: '#6B7280', fontFamily: 'DM Mono, monospace' }}>Import your data → get real AI analysis → create better content</p>
          </div>
          <div style={{ marginLeft: 'auto', padding: '4px 12px', background: '#0A1A0A', border: '1px solid #1A3A1A', borderRadius: '20px', fontSize: '11px', color: '#4ADE80', fontFamily: 'DM Mono, monospace' }}>✦ Memory Active</div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: '3px', background: '#1A1A2E', borderRadius: '10px', padding: '4px', width: 'fit-content', marginBottom: '22px', border: '1px solid #2D2D44' }}>
        {tabs.map(t => <TabBtn key={t.id} active={activeTab === t.id} onClick={() => setActiveTab(t.id)} label={t.label} icon={t.icon} />)}
      </div>

      {/* Content */}
      {activeTab === 'import' && <ImportTab onImportDone={() => { setDataRefresh(r => r+1); setActiveTab('analyze'); }} />}
      {activeTab === 'analyze' && <AnalyzeTab key={dataRefresh} />}
      {activeTab === 'write' && <WriteTab />}
      {activeTab === 'interview' && <InterviewTab />}
      {activeTab === 'review' && <WeeklyReviewTab />}

      <ChatBubble />
    </div>
  );
}
