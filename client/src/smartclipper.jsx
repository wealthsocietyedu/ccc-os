import { useState, useEffect, useRef } from 'react';

const API = '/api/smart-clipper';

async function apiFetch(endpoint, body, method = 'POST') {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API}${endpoint}`, opts);
  if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Request failed'); }
  return res.json();
}

// ─── Design tokens (TVA theme) ────────────────────────────────────────────────
const C = {
  bg: '#0C0A07', surface: '#1A1610', surface2: '#231E16', surface3: '#2E2720',
  border: '#2D2318', border2: '#3D3428', border3: '#5C4E38',
  amber: '#F0A800', amberMid: '#D4953A', amberDim: '#7A5820',
  amberText: '#FCD97A', amberSub: 'rgba(212,149,58,0.08)',
  teal: '#3D9E8C', tealDim: '#1E5050', tealText: '#6ECFBF', tealSub: 'rgba(61,158,140,0.08)',
  red: '#C42A18', redText: '#F87060', redSub: 'rgba(196,42,24,0.1)',
  text: '#F0EBE0', text2: '#A89880', text3: '#6B5E4E', text4: '#3D3428',
  font: "'Sora', sans-serif", mono: "'DM Mono', monospace",
};

// ─── Shared UI ────────────────────────────────────────────────────────────────
const Btn = ({ children, onClick, variant = 'primary', disabled, style = {} }) => {
  const v = {
    primary: { background: `linear-gradient(135deg,${C.amberMid},${C.amber})`, color: '#0C0A07', border: 'none', boxShadow: `0 0 18px rgba(212,149,58,0.3)` },
    secondary: { background: C.surface2, color: C.text2, border: `1px solid ${C.border2}` },
    teal: { background: C.tealSub, color: C.tealText, border: `1px solid ${C.tealDim}` },
    ghost: { background: 'transparent', color: C.text3, border: `1px solid ${C.border}` },
    danger: { background: C.redSub, color: C.redText, border: `1px solid ${C.red}` },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 8, fontFamily: C.font, fontSize: 13, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, transition: 'all .15s', ...v[variant], ...style }}>
      {children}
    </button>
  );
};

const Input = ({ label, value, onChange, placeholder, multiline, rows = 3 }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
    {label && <label style={{ fontFamily: C.mono, fontSize: 10, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</label>}
    {multiline
      ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} style={{ background: C.surface, border: `1px solid ${C.border2}`, borderRadius: 8, color: C.text, padding: '10px 12px', fontSize: 13, fontFamily: C.font, outline: 'none', resize: 'vertical' }} />
      : <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ background: C.surface, border: `1px solid ${C.border2}`, borderRadius: 8, color: C.text, padding: '10px 12px', fontSize: 13, fontFamily: C.font, outline: 'none' }} />
    }
  </div>
);

const Tag = ({ children, color = 'amber' }) => {
  const s = { amber: { bg: C.amberSub, text: C.amberText, border: C.amberDim }, teal: { bg: C.tealSub, text: C.tealText, border: C.tealDim }, neutral: { bg: C.surface2, text: C.text3, border: C.border } }[color] || { bg: C.surface2, text: C.text3, border: C.border };
  return <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 4, fontFamily: C.mono, fontSize: 10, background: s.bg, color: s.text, border: `1px solid ${s.border}` }}>{children}</span>;
};

const Spinner = ({ size = 36 }) => (
  <div style={{ width: size, height: size, border: `3px solid ${C.amberMid}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
);

// ─── Virality Score Ring ──────────────────────────────────────────────────────
function ScoreRing({ score }) {
  const r = 22, circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = score >= 80 ? C.amber : score >= 60 ? C.teal : C.text3;
  return (
    <div style={{ position: 'relative', width: 56, height: 56, flexShrink: 0 }}>
      <svg width="56" height="56" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="28" cy="28" r={r} fill="none" stroke={C.border2} strokeWidth="3" />
        <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="3" strokeDasharray={`${fill} ${circ}`} strokeLinecap="round" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color, fontFamily: C.mono }}>
        {score}
      </div>
    </div>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
function ProgressBar({ stage, progress }) {
  const stages = ['downloading', 'transcribing', 'analyzing', 'cutting', 'complete'];
  const labels = { downloading: '⬇ Downloading', transcribing: '🎙 Transcribing', analyzing: '🧠 Analyzing', cutting: '✂ Cutting Clips', complete: '✓ Done' };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: C.mono, fontSize: 11, color: C.amberText, textTransform: 'uppercase' }}>{labels[stage] || stage}</span>
        <span style={{ fontFamily: C.mono, fontSize: 11, color: C.text3 }}>{progress}%</span>
      </div>
      <div style={{ height: 6, background: C.border, borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${progress}%`, background: `linear-gradient(90deg,${C.amberMid},${C.amber})`, borderRadius: 3, transition: 'width .5s ease' }} />
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {stages.map(s => (
          <div key={s} style={{ flex: 1, height: 3, borderRadius: 2, background: stages.indexOf(s) <= stages.indexOf(stage) ? C.amberMid : C.border, transition: 'background .3s' }} />
        ))}
      </div>
    </div>
  );
}

// ─── Clip Card ────────────────────────────────────────────────────────────────
function ClipCard({ clip, jobId, onSendToScheduler }) {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef(null);
  const previewUrl = `${API}/preview/${jobId}/${clip.file}`;
  const downloadUrl = `${API}/download/${jobId}/${clip.file}`;

  const emotionColors = { curiosity: C.teal, surprise: C.amber, inspiration: '#4ADE80', relatability: '#A78BFA', controversy: C.red };
  const emotionColor = emotionColors[clip.emotion] || C.text3;

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border2}`, borderRadius: 14, overflow: 'hidden', transition: 'border-color .15s' }}>
      {/* Video preview */}
      <div style={{ position: 'relative', background: '#000', aspectRatio: '16/9' }}>
        <video
          ref={videoRef}
          src={previewUrl}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onClick={() => { playing ? videoRef.current.pause() : videoRef.current.play(); setPlaying(!playing); }}
          onEnded={() => setPlaying(false)}
        />
        {!playing && (
          <div onClick={() => { videoRef.current.play(); setPlaying(true); }} style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'rgba(0,0,0,0.4)' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: `rgba(240,168,0,0.9)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>▶</div>
          </div>
        )}
        {/* Badges */}
        <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 6 }}>
          <div style={{ background: 'rgba(0,0,0,0.8)', borderRadius: 6, padding: '3px 8px', fontFamily: C.mono, fontSize: 10, color: C.text }}>
            Clip {clip.clip_number}
          </div>
          <div style={{ background: 'rgba(0,0,0,0.8)', borderRadius: 6, padding: '3px 8px', fontFamily: C.mono, fontSize: 10, color: C.amberText }}>
            {clip.duration}s
          </div>
        </div>
        <div style={{ position: 'absolute', top: 10, right: 10 }}>
          <ScoreRing score={clip.virality_score} />
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>{clip.title}</div>
            <div style={{ fontSize: 12, color: C.text3, fontStyle: 'italic' }}>"{clip.hook}"</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          <Tag color="amber">🔥 {clip.virality_score} virality</Tag>
          <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 4, fontFamily: C.mono, fontSize: 10, background: `${emotionColor}15`, color: emotionColor, border: `1px solid ${emotionColor}40` }}>{clip.emotion}</span>
          {clip.pillar_match && <Tag color="teal">✦ {clip.pillar_match}</Tag>}
        </div>

        <div style={{ background: C.surface2, borderRadius: 8, padding: '8px 10px', marginBottom: 12, fontSize: 12, color: C.text3, lineHeight: 1.5 }}>
          {clip.why_viral}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <a href={downloadUrl} download={`clip_${clip.clip_number}.mp4`} style={{ textDecoration: 'none', flex: 1 }}>
            <Btn variant="primary" style={{ width: '100%', justifyContent: 'center', fontSize: 12, padding: '8px 12px' }}>
              ↓ Download
            </Btn>
          </a>
          <Btn variant="teal" onClick={() => onSendToScheduler(clip)} style={{ fontSize: 12, padding: '8px 12px' }}>
            📅 Schedule
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SmartClipper() {
  const [url, setUrl] = useState('');
  const [pillars, setPillars] = useState('');
  const [niche, setNiche] = useState('');
  const [clipCount, setClipCount] = useState('5');
  const [captionStyle, setCaptionStyle] = useState('bold');
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState(null);
  const [clips, setClips] = useState([]);
  const [error, setError] = useState('');
  const [health, setHealth] = useState(null);
  const pollRef = useRef(null);

  // Check system health on mount
  useEffect(() => {
    fetch(`${API}/health`).then(r => r.json()).then(setHealth).catch(() => {});
  }, []);

  // Poll job status
  useEffect(() => {
    if (!jobId) return;
    pollRef.current = setInterval(async () => {
      try {
        const data = await apiFetch(`/status/${jobId}`, null, 'GET');
        setStatus(data);
        if (data.status === 'completed') {
          clearInterval(pollRef.current);
          setLoading(false);
          setClips(data.clips || []);
        }
        if (data.status === 'failed') {
          clearInterval(pollRef.current);
          setLoading(false);
          setError(data.error || 'Processing failed');
        }
      } catch (e) {
        clearInterval(pollRef.current);
        setLoading(false);
        setError(e.message);
      }
    }, 3000);
    return () => clearInterval(pollRef.current);
  }, [jobId]);

  const handleClip = async () => {
    if (!url.trim()) return;
    setLoading(true); setError(''); setClips([]); setStatus(null); setJobId(null);
    try {
      const data = await apiFetch('/clip', { url, contentPillars: pillars, niche, clipCount: parseInt(clipCount), captionStyle });
      setJobId(data.job_id);
      setStatus({ stage: 'downloading', progress: 5 });
    } catch (e) {
      setLoading(false);
      setError(e.message);
    }
  };

  const handleSendToScheduler = (clip) => {
    alert(`"${clip.title}" — send to scheduler coming soon! Download the clip first and use your Distribution Room.`);
  };

  const handleReset = () => {
    if (jobId) apiFetch(`/job/${jobId}`, null, 'DELETE').catch(() => {});
    setJobId(null); setStatus(null); setClips([]); setLoading(false); setError(''); setUrl('');
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: C.font, padding: 32 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: ${C.bg}; }
        ::-webkit-scrollbar-thumb { background: ${C.border2}; border-radius: 3px; }
        input::placeholder, textarea::placeholder { color: ${C.text4}; }
        select option { background: ${C.surface}; color: ${C.text}; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 28, animation: 'fadeUp .3s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div style={{ fontFamily: C.mono, fontSize: 10, color: C.amberText, textTransform: 'uppercase', letterSpacing: '0.12em' }}>——</div>
          <div style={{ fontFamily: C.mono, fontSize: 10, color: C.amberText, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Smart Clipper</div>
        </div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: C.text, letterSpacing: '-0.03em' }}>AI Clip Engine</h1>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: C.text3 }}>Paste any YouTube URL → AI finds your best clips → ready to post</p>
      </div>

      {/* System health */}
      {health && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { label: 'yt-dlp', ok: health.checks.ytdlp, note: 'video download' },
            { label: 'FFmpeg', ok: health.checks.ffmpeg, note: 'video cutting' },
            { label: 'Whisper', ok: health.checks.whisper, note: health.checks.whisper ? 'local — free' : 'using OpenAI API' },
          ].map(({ label, ok, note }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: ok ? C.tealSub : C.amberSub, border: `1px solid ${ok ? C.tealDim : C.amberDim}`, borderRadius: 6 }}>
              <span style={{ fontSize: 10 }}>{ok ? '●' : '○'}</span>
              <span style={{ fontFamily: C.mono, fontSize: 10, color: ok ? C.tealText : C.amberText }}>{label}</span>
              <span style={{ fontFamily: C.mono, fontSize: 9, color: C.text3 }}>{note}</span>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: C.tealSub, border: `1px solid ${C.tealDim}`, borderRadius: 6 }}>
            <span style={{ fontSize: 10, color: C.tealText }}>●</span>
            <span style={{ fontFamily: C.mono, fontSize: 10, color: C.tealText }}>Claude AI</span>
            <span style={{ fontFamily: C.mono, fontSize: 9, color: C.text3 }}>viral detection</span>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: clips.length ? '360px 1fr' : '500px 1fr', gap: 28 }}>
        {/* Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: C.amberSub, border: `1px solid ${C.amberDim}`, borderRadius: 10, padding: 14 }}>
            <div style={{ fontFamily: C.mono, fontSize: 9, color: C.amberText, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>✦ 100% Free Pipeline</div>
            <div style={{ fontSize: 12, color: C.text3, lineHeight: 1.5 }}>yt-dlp + Whisper + FFmpeg — no API costs except Claude (your existing key)</div>
          </div>

          <Input label="YouTube URL" value={url} onChange={setUrl} placeholder="https://youtube.com/watch?v=..." />
          <Input label="Your Content Pillars (optional — improves matching)" value={pillars} onChange={setPillars} placeholder="Faith, Business, Productivity, Mindset..." multiline rows={2} />
          <Input label="Your Niche" value={niche} onChange={setNiche} placeholder="Christian entrepreneurs, fitness coaches..." />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontFamily: C.mono, fontSize: 10, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Clips to find</label>
              <select value={clipCount} onChange={e => setClipCount(e.target.value)} style={{ background: C.surface, border: `1px solid ${C.border2}`, borderRadius: 8, color: C.text, padding: '10px 12px', fontSize: 13, fontFamily: C.font, outline: 'none', appearance: 'none' }}>
                {['3','5','7','10'].map(n => <option key={n} value={n}>{n} clips</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontFamily: C.mono, fontSize: 10, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Caption style</label>
              <select value={captionStyle} onChange={e => setCaptionStyle(e.target.value)} style={{ background: C.surface, border: `1px solid ${C.border2}`, borderRadius: 8, color: C.text, padding: '10px 12px', fontSize: 13, fontFamily: C.font, outline: 'none', appearance: 'none' }}>
                <option value="bold">Bold White</option>
                <option value="yellow">Yellow Bold</option>
                <option value="minimal">Minimal</option>
              </select>
            </div>
          </div>

          {!loading && !clips.length && (
            <Btn onClick={handleClip} disabled={!url.trim() || loading}>
              ✂ Extract Clips
            </Btn>
          )}
          {(loading || clips.length > 0) && (
            <Btn variant="ghost" onClick={handleReset} style={{ fontSize: 12 }}>
              ← New Video
            </Btn>
          )}

          {error && (
            <div style={{ background: C.redSub, border: `1px solid ${C.red}`, borderRadius: 8, padding: 12, color: C.redText, fontSize: 12, fontFamily: C.mono }}>
              {error}
            </div>
          )}

          {/* How it works */}
          {!loading && !clips.length && (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14 }}>
              <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, textTransform: 'uppercase', marginBottom: 10 }}>Pipeline</div>
              {[
                ['⬇', 'Download video (yt-dlp)'],
                ['🎙', 'Transcribe audio (Whisper)'],
                ['🧠', 'Claude finds best moments'],
                ['✂', 'FFmpeg cuts + crops clips'],
                ['💬', 'Captions burned in'],
                ['✓', 'Ready to download or schedule'],
              ].map(([icon, text]) => (
                <div key={text} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 14, width: 20 }}>{icon}</span>
                  <span style={{ fontSize: 12, color: C.text3 }}>{text}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Output */}
        <div>
          {/* Processing state */}
          {loading && status && (
            <div style={{ background: C.surface, border: `1px solid ${C.border2}`, borderRadius: 14, padding: 28 }}>
              <div style={{ marginBottom: 20 }}>
                <ProgressBar stage={status.stage} progress={status.progress} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 16, alignItems: 'center' }}>
                <Spinner />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>
                    {status.stage === 'downloading' && 'Downloading video...'}
                    {status.stage === 'transcribing' && 'Transcribing with Whisper...'}
                    {status.stage === 'analyzing' && 'Claude is finding your best clips...'}
                    {status.stage === 'cutting' && 'Cutting & captioning clips...'}
                  </div>
                  <div style={{ fontSize: 12, color: C.text3, fontFamily: C.mono }}>
                    {status.stage === 'transcribing' && 'Free local transcription — no API cost'}
                    {status.stage === 'analyzing' && `Transcript ready — ${status.transcript_length || 0} characters`}
                    {status.stage === 'cutting' && 'Burning in captions...'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Clips grid */}
          {clips.length > 0 && !loading && (
            <div style={{ animation: 'fadeUp .3s ease' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>
                    {clips.length} clips extracted ✦
                  </div>
                  <div style={{ fontSize: 12, color: C.text3, fontFamily: C.mono, marginTop: 2 }}>
                    Sorted by virality score — click ▶ to preview
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Tag color="amber">{clipCount} clips</Tag>
                  <Tag color="teal">Free pipeline</Tag>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                {[...clips].sort((a, b) => b.virality_score - a.virality_score).map(clip => (
                  <ClipCard key={clip.clip_number} clip={clip} jobId={jobId} onSendToScheduler={handleSendToScheduler} />
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!loading && !clips.length && !error && (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, minHeight: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <span style={{ fontSize: 48 }}>✂</span>
              <div style={{ fontSize: 14, color: C.text4 }}>Paste a YouTube URL to extract clips</div>
              <div style={{ fontSize: 11, color: C.text4, fontFamily: C.mono }}>Supports YouTube, and any platform yt-dlp supports</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
