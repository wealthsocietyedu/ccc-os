import { useState, useEffect, useRef, useCallback } from 'react';
import { colors, radius, font, glass, gradients, glow } from '../lib/theme.js';
import { Button, Card, StatCard, SectionLabel } from './ui/index.js';
import { smartClipper } from '../lib/api.js';

// ─── Design tokens (TVA theme — re-pointed to shared theme.js) ───────────────
const C = {
  bg: colors.bg, surface: colors.surface, surface2: colors.surface2, surface3: colors.surface2,
  border: colors.border, border2: colors.border2, border3: colors.border2,
  amber: colors.accent2, amberMid: colors.accent, amberDim: 'rgba(212,149,58,0.35)',
  amberText: colors.accent2, amberSub: 'rgba(212,149,58,0.08)',
  teal: colors.green, tealDim: 'rgba(61,158,140,0.35)', tealText: colors.cyan, tealSub: 'rgba(61,158,140,0.08)',
  red: colors.red, redText: '#F87060', redSub: 'rgba(196,42,24,0.1)',
  text: colors.text, text2: colors.text2, text3: colors.text3, text4: colors.text3,
  font: font.display, mono: font.mono,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtBytes = (b) => {
  if (!b && b !== 0) return '';
  if (b >= 1024 ** 3) return `${(b / 1024 ** 3).toFixed(2)} GB`;
  if (b >= 1024 ** 2) return `${(b / 1024 ** 2).toFixed(1)} MB`;
  if (b >= 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${b} B`;
};
const ACCEPTED = ['.mp4', '.mov', '.mkv', '.webm', '.avi', '.m4v'];
const isVideoFile = (file) =>
  !!file && ((file.type || '').startsWith('video/') || ACCEPTED.some(ext => file.name.toLowerCase().endsWith(ext)));

// ─── Shared UI ────────────────────────────────────────────────────────────────
const Input = ({ label, value, onChange, placeholder, multiline, rows = 3 }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
    {label && <label style={{ fontFamily: C.mono, fontSize: 10, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</label>}
    {multiline
      ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} style={{ background: C.surface, border: `1px solid ${C.border2}`, borderRadius: radius.sm, color: C.text, padding: '10px 12px', fontSize: 13, fontFamily: C.font, outline: 'none', resize: 'vertical' }} />
      : <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ background: C.surface, border: `1px solid ${C.border2}`, borderRadius: radius.sm, color: C.text, padding: '10px 12px', fontSize: 13, fontFamily: C.font, outline: 'none' }} />
    }
  </div>
);
const Tag = ({ children, color = 'amber' }) => {
  const s = { amber: { bg: C.amberSub, text: C.amberText, border: C.amberDim }, teal: { bg: C.tealSub, text: C.tealText, border: C.tealDim }, neutral: { bg: C.surface2, text: C.text3, border: C.border } }[color] || { bg: C.surface2, text: C.text3, border: C.border };
  return <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: radius.pill, fontFamily: C.mono, fontSize: 10, background: s.bg, color: s.text, border: `1px solid ${s.border}` }}>{children}</span>;
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

// ─── Progress Bar (upload-only pipeline: no "download" stage) ─────────────────
function ProgressBar({ stage, progress }) {
  const stages = ['uploading', 'transcribing', 'analyzing', 'cutting', 'complete'];
  const labels = { uploading: '⬆ Uploading', transcribing: '🎙 Transcribing', analyzing: '🧠 Analyzing', cutting: '✂ Cutting Clips', complete: '✓ Done' };
  const idx = Math.max(stages.indexOf(stage), 0);
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
        {stages.map((s, i) => (
          <div key={s} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= idx ? C.amberMid : C.border, transition: 'background .3s' }} />
        ))}
      </div>
    </div>
  );
}

// ─── Clip Card ────────────────────────────────────────────────────────────────
function ClipCard({ clip, jobId, onSendToScheduler }) {
  const [playing, setPlaying] = useState(false);
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [mediaError, setMediaError] = useState(null);
  const videoRef = useRef(null);

  // Preview bytes are fetched with the auth header (native <video src> can't send
  // it), then played from a blob URL. Revoke it when the card unmounts.
  useEffect(() => () => { if (blobUrl) URL.revokeObjectURL(blobUrl); }, [blobUrl]);

  // Once the blob URL is bound to the <video>, start playback. Doing this in an
  // effect (rather than right after setBlobUrl) avoids a race where play() runs
  // before React commits the new src.
  useEffect(() => {
    if (blobUrl && videoRef.current) {
      videoRef.current.play().then(() => setPlaying(true)).catch(() => {});
    }
  }, [blobUrl]);

  const loadAndPlay = async () => {
    setMediaError(null);
    if (blobUrl) {
      videoRef.current?.play();
      setPlaying(true);
      return;
    }
    try {
      setLoading(true);
      const url = await smartClipper.fetchClipObjectUrl(jobId, clip.file);
      setBlobUrl(url); // the effect above starts playback once src is committed
    } catch (e) {
      setMediaError('Preview unavailable');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      setMediaError(null);
      setDownloading(true);
      await smartClipper.downloadClip(jobId, clip.file, `clip_${clip.clip_number}.mp4`);
    } catch (e) {
      setMediaError('Download failed');
    } finally {
      setDownloading(false);
    }
  };

  const emotionColors = { curiosity: C.teal, surprise: C.amber, inspiration: '#4ADE80', relatability: '#A78BFA', controversy: C.red };
  const emotionColor = emotionColors[clip.emotion] || C.text3;
  return (
    <div style={{ ...glass, padding: 0, overflow: 'hidden' }}>
      {/* Video preview */}
      <div style={{ position: 'relative', background: '#000', aspectRatio: '16/9' }}>
        <video
          ref={videoRef}
          src={blobUrl || undefined}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onClick={() => { if (!blobUrl) return loadAndPlay(); playing ? videoRef.current.pause() : videoRef.current.play(); setPlaying(!playing); }}
          onEnded={() => setPlaying(false)}
        />
        {!playing && (
          <div onClick={loadAndPlay} style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'rgba(0,0,0,0.4)' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: `rgba(240,168,0,0.9)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
              {loading ? '…' : mediaError ? '⚠' : '▶'}
            </div>
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
          <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: radius.pill, fontFamily: C.mono, fontSize: 10, background: `${emotionColor}15`, color: emotionColor, border: `1px solid ${emotionColor}40` }}>{clip.emotion}</span>
          {clip.pillar_match && <Tag color="teal">✦ {clip.pillar_match}</Tag>}
        </div>
        <div style={{ background: C.surface2, borderRadius: radius.sm, padding: '8px 10px', marginBottom: 12, fontSize: 12, color: C.text3, lineHeight: 1.5 }}>
          {clip.why_viral}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="primary" size="sm" style={{ flex: 1 }} onClick={handleDownload} disabled={downloading}>
            {downloading ? 'Downloading…' : '↓ Download'}
          </Button>
          <Button variant="secondary" size="sm" style={{ color: C.tealText, borderColor: C.tealDim }} onClick={() => onSendToScheduler(clip)}>
            📅 Schedule
          </Button>
        </div>
        {mediaError && (
          <div style={{ marginTop: 8, fontSize: 11, color: C.red, fontFamily: C.mono }}>{mediaError}</div>
        )}
      </div>
    </div>
  );
}

// ─── Drop zone (upload-only ingest) ───────────────────────────────────────────
function DropZone({ file, onPick, onClear, disabled }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) onPick(dropped);
  };

  if (file) {
    return (
      <div style={{ ...glass, padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: radius.sm, background: gradients.amber, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🎬</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
          <div style={{ fontSize: 11, color: C.text3, fontFamily: C.mono, marginTop: 2 }}>{fmtBytes(file.size)} · ready to clip</div>
        </div>
        {!disabled && (
          <Button variant="ghost" size="sm" onClick={onClear}>✕ Remove</Button>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      style={{
        border: `1.5px dashed ${dragging ? C.amber : C.border2}`,
        borderRadius: radius.lg,
        background: dragging ? C.amberSub : C.surface,
        padding: '40px 24px',
        textAlign: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'border-color .18s, background .18s',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="video/*,.mp4,.mov,.mkv,.webm,.avi,.m4v"
        style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = ''; }}
      />
      <div style={{ fontSize: 40, marginBottom: 12 }}>⬆</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 6 }}>Drop your video here</div>
      <div style={{ fontSize: 12, color: C.text3, marginBottom: 4 }}>or click to browse — upload a long-form video you already have</div>
      <div style={{ fontSize: 11, color: C.text4, fontFamily: C.mono }}>MP4 · MOV · MKV · WEBM · AVI (up to 3GB)</div>
    </div>
  );
}

// ─── Main Component (upload-only) ─────────────────────────────────────────────
export default function SmartClipper() {
  const [file, setFile] = useState(null);
  const [pillars, setPillars] = useState('');
  const [niche, setNiche] = useState('');
  const [clipCount, setClipCount] = useState('5');
  const [captionStyle, setCaptionStyle] = useState('bold');
  const [uploadPct, setUploadPct] = useState(0);
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState(null);
  const [clips, setClips] = useState([]);
  const [error, setError] = useState('');
  const [health, setHealth] = useState(null);
  const pollRef = useRef(null);

  // Check system health on mount (upload flow needs FFmpeg + transcription, not yt-dlp)
  useEffect(() => {
    smartClipper.health().then(setHealth).catch(() => {});
  }, []);

  // Poll job status once a job exists
  useEffect(() => {
    if (!jobId) return;
    pollRef.current = setInterval(async () => {
      try {
        const data = await smartClipper.status(jobId);
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

  const handlePick = (f) => {
    if (!isVideoFile(f)) { setError('That file is not a supported video format. Use MP4, MOV, MKV, WEBM, or AVI.'); return; }
    setError('');
    setFile(f);
  };

  const handleClip = async () => {
    if (!file) return;
    setLoading(true); setError(''); setClips([]); setStatus({ stage: 'uploading', progress: 0 }); setJobId(null); setUploadPct(0);
    try {
      const data = await smartClipper.uploadAndClip({
        file,
        contentPillars: pillars,
        niche,
        clipCount: parseInt(clipCount),
        captionStyle,
        onProgress: (pct) => {
          setUploadPct(pct);
          setStatus({ stage: 'uploading', progress: pct });
        },
      });
      setJobId(data.job_id);
      setStatus({ stage: 'transcribing', progress: 20 });
    } catch (e) {
      setLoading(false);
      setError(e.message);
    }
  };

  const handleSendToScheduler = (clip) => {
    alert(`"${clip.title}" — send to scheduler coming soon! Download the clip first and use your Distribution Room.`);
  };

  const handleReset = () => {
    if (jobId) smartClipper.remove(jobId).catch(() => {});
    if (pollRef.current) clearInterval(pollRef.current);
    setJobId(null); setStatus(null); setClips([]); setLoading(false); setError(''); setFile(null); setUploadPct(0);
  };

  const displayStatus = status || (loading ? { stage: 'uploading', progress: uploadPct } : null);

  return (
    <div style={{ minHeight: '100%', background: C.bg, color: C.text, fontFamily: C.font, padding: 32 }}>
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
        <SectionLabel>AI Pipeline</SectionLabel>
        <h1 style={{ margin: '10px 0 0', fontSize: 32, fontWeight: 800, color: C.text, letterSpacing: '-0.03em', fontFamily: C.font, lineHeight: 1.04 }}>Smart Clipper</h1>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: C.text3 }}>Upload a long-form video → AI finds your best moments → export ready-to-post clips</p>
      </div>

      {/* System health */}
      {health?.checks && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { label: 'FFmpeg', ok: health.checks.ffmpeg, note: 'video cutting' },
            { label: 'Whisper', ok: health.checks.whisper, note: health.checks.whisper ? 'local — free' : 'using OpenAI API' },
          ].map(({ label, ok, note }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: ok ? C.tealSub : C.amberSub, border: `1px solid ${ok ? C.tealDim : C.amberDim}`, borderRadius: radius.pill }}>
              <span style={{ fontSize: 10 }}>{ok ? '●' : '○'}</span>
              <span style={{ fontFamily: C.mono, fontSize: 10, color: ok ? C.tealText : C.amberText }}>{label}</span>
              <span style={{ fontFamily: C.mono, fontSize: 9, color: C.text3 }}>{note}</span>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: C.tealSub, border: `1px solid ${C.tealDim}`, borderRadius: radius.pill }}>
            <span style={{ fontSize: 10, color: C.tealText }}>●</span>
            <span style={{ fontFamily: C.mono, fontSize: 10, color: C.tealText }}>Claude AI</span>
            <span style={{ fontFamily: C.mono, fontSize: 9, color: C.text3 }}>moment detection</span>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: clips.length ? '360px 1fr' : '500px 1fr', gap: 28 }}>
        {/* Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <DropZone file={file} onPick={handlePick} onClear={() => setFile(null)} disabled={loading} />

          <Input label="Your Content Pillars (optional — improves matching)" value={pillars} onChange={setPillars} placeholder="Faith, Business, Productivity, Mindset..." multiline rows={2} />
          <Input label="Your Niche (optional)" value={niche} onChange={setNiche} placeholder="Christian entrepreneurs, fitness coaches..." />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontFamily: C.mono, fontSize: 10, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Clips to find</label>
              <select value={clipCount} onChange={e => setClipCount(e.target.value)} style={{ background: C.surface, border: `1px solid ${C.border2}`, borderRadius: radius.sm, color: C.text, padding: '10px 12px', fontSize: 13, fontFamily: C.font, outline: 'none', appearance: 'none' }}>
                {['3','5','7','10'].map(n => <option key={n} value={n}>{n} clips</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontFamily: C.mono, fontSize: 10, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Caption style</label>
              <select value={captionStyle} onChange={e => setCaptionStyle(e.target.value)} style={{ background: C.surface, border: `1px solid ${C.border2}`, borderRadius: radius.sm, color: C.text, padding: '10px 12px', fontSize: 13, fontFamily: C.font, outline: 'none', appearance: 'none' }}>
                <option value="bold">Bold White</option>
                <option value="yellow">Yellow Bold</option>
                <option value="minimal">Minimal</option>
              </select>
            </div>
          </div>

          {!loading && !clips.length && (
            <Button onClick={handleClip} disabled={!file || loading} style={{ width: '100%' }}>
              ✂ Extract Clips
            </Button>
          )}
          {(loading || clips.length > 0) && (
            <Button variant="ghost" onClick={handleReset} style={{ fontSize: 12 }}>
              ← New Upload
            </Button>
          )}
          {error && (
            <div style={{ background: C.redSub, border: `1px solid ${C.red}`, borderRadius: radius.sm, padding: 12, color: C.redText, fontSize: 12, fontFamily: C.mono }}>
              {error}
            </div>
          )}

          {/* How it works */}
          {!loading && !clips.length && (
            <Card style={{ padding: 14 }}>
              <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, textTransform: 'uppercase', marginBottom: 10 }}>Pipeline</div>
              {[
                ['⬆', 'Upload your long-form video'],
                ['🎙', 'Transcribe audio (Whisper)'],
                ['🧠', 'Claude finds best moments'],
                ['✂', 'FFmpeg cuts + crops clips'],
                ['💬', 'Captions burned in'],
                ['✓', 'Download or schedule each clip'],
              ].map(([icon, text]) => (
                <div key={text} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 14, width: 20 }}>{icon}</span>
                  <span style={{ fontSize: 12, color: C.text3 }}>{text}</span>
                </div>
              ))}
            </Card>
          )}
        </div>

        {/* Output */}
        <div>
          {/* Processing state */}
          {loading && displayStatus && (
            <Card style={{ padding: 28 }}>
              <div style={{ marginBottom: 20 }}>
                <ProgressBar stage={displayStatus.stage} progress={displayStatus.progress} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 16, alignItems: 'center' }}>
                <Spinner />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>
                    {displayStatus.stage === 'uploading' && 'Uploading your video...'}
                    {displayStatus.stage === 'transcribing' && 'Transcribing with Whisper...'}
                    {displayStatus.stage === 'analyzing' && 'Claude is finding your best clips...'}
                    {displayStatus.stage === 'cutting' && 'Cutting & captioning clips...'}
                  </div>
                  <div style={{ fontSize: 12, color: C.text3, fontFamily: C.mono }}>
                    {displayStatus.stage === 'uploading' && `${uploadPct}% uploaded — keep this tab open`}
                    {displayStatus.stage === 'transcribing' && 'Free local transcription — no API cost'}
                    {displayStatus.stage === 'analyzing' && `Transcript ready — ${displayStatus.transcript_length || 0} characters`}
                    {displayStatus.stage === 'cutting' && 'Burning in captions...'}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Clips grid */}
          {clips.length > 0 && !loading && (
            <div style={{ animation: 'fadeUp .3s ease' }}>
              <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                <StatCard value={clips.length} label="Clips Extracted" style={{ flex: '1 1 140px' }} />
                <StatCard value={Math.round(clips.reduce((s, c) => s + c.virality_score, 0) / clips.length) || 0} label="Avg Virality" style={{ flex: '1 1 140px' }} />
                <StatCard value={clips.reduce((s, c) => s + Math.round(parseFloat(c.duration) || 0), 0) + 's'} label="Total Runtime" style={{ flex: '1 1 140px' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: C.text3, fontFamily: C.mono }}>
                  Sorted by virality score — click ▶ to preview
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Tag color="teal">Upload pipeline</Tag>
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
            <Card style={{ minHeight: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <span style={{ fontSize: 48 }}>✂</span>
              <div style={{ fontSize: 14, color: C.text4 }}>Upload a video to extract clips</div>
              <div style={{ fontSize: 11, color: C.text4, fontFamily: C.mono }}>Your file is analyzed for highlight moments — no link needed</div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
