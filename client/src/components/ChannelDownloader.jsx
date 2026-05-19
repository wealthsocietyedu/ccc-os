import { useState, useEffect, useRef, useCallback } from 'react';

const API = '/api/channel-downloader';

// ─── Design tokens (CCC OS TVA theme) ────────────────────────────────────────
const C = {
  bg:       '#0C0A07',
  bgCard:   '#111009',
  bgInput:  '#1A1712',
  border:   '#2A2520',
  borderHi: '#3D3328',
  amber:    '#F0A800',
  amberDim: '#D4953A',
  teal:     '#3D9E8C',
  tealDim:  '#2A6E62',
  red:      '#C0392B',
  green:    '#27AE60',
  textPri:  '#EDE8DF',
  textSec:  '#8A8070',
  textMut:  '#4A4438',
  mono:     '"DM Mono", monospace',
  sans:     '"Sora", sans-serif',
};

// ─── Fetch helper ─────────────────────────────────────────────────────────────
async function api(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── Platform config ──────────────────────────────────────────────────────────
const PLATFORMS = {
  tiktok:    { icon: '🎵', label: 'TikTok',    color: '#EE1D52', avgMB: 8   },
  instagram: { icon: '📷', label: 'Instagram', color: '#E1306C', avgMB: 12  },
  youtube:   { icon: '▶️', label: 'YouTube',   color: '#FF0000', avgMB: 150 },
};

function detectPlatform(url) {
  if (!url) return null;
  const u = url.toLowerCase();
  if (u.includes('tiktok.com')) return 'tiktok';
  if (u.includes('instagram.com')) return 'instagram';
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  return null;
}

function estimateMB(platform, count, quality, audioOnly) {
  if (audioOnly) return count * 5;
  if (platform === 'youtube') {
    const m = { '720': 80, '1080': 150, '4k': 400, 'best': 200 };
    return count * (m[quality] || 150);
  }
  return count * (PLATFORMS[platform]?.avgMB || 10);
}

function fmtMB(mb) {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb} MB`;
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Shared UI primitives ─────────────────────────────────────────────────────

function TabBtn({ active, onClick, icon, label, badge }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '9px 18px', borderRadius: 8, border: 'none',
      cursor: 'pointer', fontSize: 13, fontFamily: C.sans,
      fontWeight: active ? 600 : 400,
      background: active ? C.amber : 'transparent',
      color: active ? C.bg : C.textSec,
      transition: 'all .2s',
      position: 'relative',
    }}>
      <span>{icon}</span>
      <span>{label}</span>
      {badge > 0 && (
        <span style={{
          position: 'absolute', top: 4, right: 4,
          background: C.red, color: '#fff', borderRadius: 99,
          fontSize: 10, fontFamily: C.mono, padding: '1px 5px',
          lineHeight: 1.4,
        }}>{badge}</span>
      )}
    </button>
  );
}

function StatusBadge({ status }) {
  const map = {
    queued:    { bg: '#1A1712', color: C.textSec,  dot: C.textSec,  label: 'Queued'    },
    running:   { bg: '#0A1A10', color: C.teal,     dot: C.teal,     label: 'Running'   },
    completed: { bg: '#0A1408', color: C.green,    dot: C.green,    label: 'Completed' },
    failed:    { bg: '#1A0A08', color: C.red,      dot: C.red,      label: 'Failed'    },
    cancelled: { bg: '#1A1510', color: C.textSec,  dot: C.textMut,  label: 'Cancelled' },
  };
  const s = map[status] || map.queued;
  return (
    <span style={{
      background: s.bg, color: s.color, border: `1px solid ${s.dot}33`,
      borderRadius: 99, padding: '3px 10px', fontSize: 11,
      fontFamily: C.mono, display: 'inline-flex', alignItems: 'center', gap: 6,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, animation: status === 'running' ? 'pulse 1.5s infinite' : 'none' }} />
      {s.label}
    </span>
  );
}

function ProgressBar({ pct, color = C.amber }) {
  return (
    <div style={{ height: 4, background: C.bgInput, borderRadius: 99, overflow: 'hidden' }}>
      <div style={{
        height: '100%', width: `${Math.min(pct || 0, 100)}%`,
        background: `linear-gradient(90deg, ${color}, ${color}AA)`,
        borderRadius: 99, transition: 'width .4s ease',
      }} />
    </div>
  );
}

function Label({ children }) {
  return (
    <span style={{ fontSize: 11, fontFamily: C.mono, color: C.textSec, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
      {children}
    </span>
  );
}

function Section({ title, children, action }) {
  return (
    <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {(title || action) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {title && <Label>{title}</Label>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

// ─── TAB 1 — Download ─────────────────────────────────────────────────────────
function DownloadTab({ onJobStarted }) {
  const [url, setUrl] = useState('');
  const [maxVideos, setMaxVideos] = useState(25);
  const [quality, setQuality] = useState('1080');
  const [audioOnly, setAudioOnly] = useState(false);
  const [dateAfter, setDateAfter] = useState('');
  const [subtitles, setSubtitles] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const platform = detectPlatform(url);
  const estimatedMB = platform ? estimateMB(platform, maxVideos, quality, audioOnly) : 0;
  const storageWarning = estimatedMB > 2000;

  const handleStart = async () => {
    if (!url.trim()) return;
    setLoading(true); setError(''); setSuccess('');
    try {
      const data = await api('/start', {
        method: 'POST',
        body: { url, maxVideos, quality, audioOnly, dateAfter, subtitles },
      });
      setSuccess(`✓ Download started for @${data.channelHandle} — estimated ${fmtMB(data.estimatedMB)}`);
      setUrl('');
      onJobStarted?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, maxWidth: 1100 }}>

      {/* Left: URL + main controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* URL input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Label>Channel or Profile URL</Label>
          <div style={{ position: 'relative' }}>
            <input
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleStart()}
              placeholder="https://www.tiktok.com/@username  ·  instagram.com/handle  ·  youtube.com/@channel"
              style={{
                width: '100%', boxSizing: 'border-box',
                background: C.bgInput, border: `1px solid ${platform ? C.amber + '66' : C.border}`,
                borderRadius: 10, color: C.textPri, padding: '13px 48px 13px 14px',
                fontSize: 14, fontFamily: C.sans, outline: 'none',
                transition: 'border-color .2s',
              }}
            />
            {platform && (
              <div style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                display: 'flex', alignItems: 'center', gap: 6,
                background: C.bg, border: `1px solid ${C.border}`,
                borderRadius: 6, padding: '3px 8px',
              }}>
                <span style={{ fontSize: 14 }}>{PLATFORMS[platform].icon}</span>
                <span style={{ fontSize: 11, color: C.amber, fontFamily: C.mono }}>{PLATFORMS[platform].label}</span>
              </div>
            )}
          </div>
        </div>

        {/* Volume selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Label>Max Videos</Label>
            <span style={{ fontSize: 13, color: C.amber, fontFamily: C.mono, fontWeight: 600 }}>{maxVideos}</span>
          </div>
          <input
            type="range" min={5} max={100} step={5} value={maxVideos}
            onChange={e => setMaxVideos(+e.target.value)}
            style={{ width: '100%', accentColor: C.amber }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: C.textMut, fontFamily: C.mono }}>5</span>
            <span style={{ fontSize: 11, color: C.textMut, fontFamily: C.mono }}>100</span>
          </div>
        </div>

        {/* Quality + audio toggle row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Label>Video Quality</Label>
            <select
              value={audioOnly ? 'audio' : quality}
              onChange={e => {
                if (e.target.value === 'audio') { setAudioOnly(true); }
                else { setAudioOnly(false); setQuality(e.target.value); }
              }}
              style={{
                background: C.bgInput, border: `1px solid ${C.border}`,
                borderRadius: 8, color: C.textPri, padding: '10px 12px',
                fontSize: 13, fontFamily: C.sans, outline: 'none',
              }}
            >
              <option value="720">720p — Standard</option>
              <option value="1080">1080p — HD</option>
              <option value="4k">4K — Best</option>
              <option value="best">Best Available</option>
              <option value="audio">🎵 Audio Only (MP3)</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Label>Download After (optional)</Label>
            <input
              type="date"
              value={dateAfter}
              onChange={e => setDateAfter(e.target.value)}
              style={{
                background: C.bgInput, border: `1px solid ${C.border}`,
                borderRadius: 8, color: C.textPri, padding: '10px 12px',
                fontSize: 13, fontFamily: C.sans, outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Toggles */}
        <div style={{ display: 'flex', gap: 12 }}>
          {[
            { label: 'Thumbnails', key: 'thumb', value: true, locked: true },
            { label: 'Subtitles (YouTube)', key: 'subs', value: subtitles, onChange: setSubtitles },
          ].map(t => (
            <div key={t.key} style={{
              flex: 1, background: C.bgCard, border: `1px solid ${C.border}`,
              borderRadius: 8, padding: '10px 14px', display: 'flex',
              justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: 13, color: C.textSec, fontFamily: C.sans }}>{t.label}</span>
              <Toggle value={t.locked ? true : t.value} onChange={t.locked ? undefined : t.onChange} disabled={t.locked} />
            </div>
          ))}
        </div>

        {/* Errors / success */}
        {error && <Alert type="error">{error}</Alert>}
        {success && <Alert type="success">{success}</Alert>}

        {/* Start button */}
        <button
          onClick={handleStart}
          disabled={loading || !platform}
          style={{
            background: loading || !platform
              ? C.bgInput
              : `linear-gradient(135deg, ${C.amber}, ${C.amberDim})`,
            border: 'none', borderRadius: 10, color: loading || !platform ? C.textMut : C.bg,
            padding: '14px 24px', fontSize: 14, fontWeight: 700,
            fontFamily: C.sans, cursor: loading || !platform ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            transition: 'all .2s', boxShadow: loading || !platform ? 'none' : `0 0 24px ${C.amber}33`,
          }}
        >
          <span style={{ fontSize: 18 }}>{loading ? '⟳' : '⬇'}</span>
          {loading ? 'Starting download...' : `Start Download${platform ? ` — ${PLATFORMS[platform].label}` : ''}`}
        </button>
      </div>

      {/* Right: info panel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Storage estimate */}
        {platform && (
          <Section title="Estimated Storage">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{
                fontSize: 28, fontWeight: 700, fontFamily: C.mono,
                color: storageWarning ? C.amberDim : C.amber,
              }}>
                {fmtMB(estimatedMB)}
              </span>
              <span style={{ fontSize: 12, color: C.textSec, fontFamily: C.mono }}>
                ~{maxVideos} videos @ {audioOnly ? 'audio' : quality}
              </span>
              {storageWarning && (
                <span style={{ fontSize: 12, color: C.amberDim, fontFamily: C.mono, marginTop: 4 }}>
                  ⚠ Large download — ensure Railway volume has space
                </span>
              )}
            </div>
          </Section>
        )}

        {/* Platform notes */}
        <Section title="Platform Notes">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { icon: '🎵', label: 'TikTok', note: 'Public profiles only. No login needed.' },
              { icon: '📷', label: 'Instagram', note: 'Public only. Private accounts blocked.' },
              { icon: '▶️', label: 'YouTube', note: 'Channels, playlists, or single videos.' },
            ].map(p => (
              <div key={p.label} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 16 }}>{p.icon}</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.textPri, fontFamily: C.sans }}>{p.label}</div>
                  <div style={{ fontSize: 11, color: C.textSec, fontFamily: C.mono }}>{p.note}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Usage note */}
        <div style={{
          background: '#0A1008', border: `1px solid ${C.tealDim}44`,
          borderRadius: 10, padding: '12px 14px',
        }}>
          <div style={{ fontSize: 11, color: C.teal, fontFamily: C.mono, marginBottom: 6 }}>✦ Research Use Only</div>
          <div style={{ fontSize: 12, color: C.textSec, fontFamily: C.sans, lineHeight: 1.6 }}>
            Downloaded content is for competitive analysis and inspiration. Respect platform ToS and creator rights.
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Toggle helper ────────────────────────────────────────────────────────────
function Toggle({ value, onChange, disabled }) {
  return (
    <div
      onClick={disabled ? undefined : () => onChange?.(!value)}
      style={{
        width: 40, height: 22, borderRadius: 11, cursor: disabled ? 'default' : 'pointer',
        background: value ? C.amber : C.bgInput,
        border: `1px solid ${value ? C.amber : C.border}`,
        position: 'relative', transition: 'all .2s', opacity: disabled ? 0.5 : 1,
      }}
    >
      <div style={{
        position: 'absolute', top: 2, left: value ? 19 : 2,
        width: 16, height: 16, borderRadius: '50%',
        background: value ? C.bg : C.textSec, transition: 'left .2s',
      }} />
    </div>
  );
}

// ─── Alert helper ─────────────────────────────────────────────────────────────
function Alert({ type, children }) {
  const styles = {
    error:   { bg: '#1A0800', border: C.red + '44',   color: '#FF8066' },
    success: { bg: '#081408', border: C.teal + '44',  color: C.teal    },
    warn:    { bg: '#1A1000', border: C.amber + '44', color: C.amberDim },
  };
  const s = styles[type] || styles.warn;
  return (
    <div style={{
      background: s.bg, border: `1px solid ${s.border}`,
      borderRadius: 8, padding: '10px 14px',
      fontSize: 13, fontFamily: C.mono, color: s.color,
    }}>
      {children}
    </div>
  );
}

// ─── Job card (shared between Queue and Library) ──────────────────────────────
function JobCard({ job, onCancel, onDelete, onAnalyze, onCleanup, expanded, onToggleExpand, analysis }) {
  const p = PLATFORMS[job.platform] || PLATFORMS.tiktok;
  const isActive = job.status === 'running' || job.status === 'queued';

  return (
    <div style={{
      background: C.bgCard, border: `1px solid ${job.status === 'running' ? C.amber + '44' : C.border}`,
      borderRadius: 12, overflow: 'hidden',
      boxShadow: job.status === 'running' ? `0 0 16px ${C.amber}11` : 'none',
    }}>
      {/* Card header */}
      <div style={{ padding: '14px 16px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 22, flexShrink: 0 }}>{p.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.textPri, fontFamily: C.sans }}>
              @{job.channel_handle}
            </span>
            <StatusBadge status={job.status} />
          </div>
          <div style={{ fontSize: 11, color: C.textSec, fontFamily: C.mono, marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {job.url}
          </div>

          {/* Progress */}
          {isActive && (
            <div style={{ marginBottom: 8 }}>
              <ProgressBar pct={job.progress} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                <span style={{ fontSize: 11, color: C.textSec, fontFamily: C.mono }}>
                  {job.downloaded_videos || 0} / {job.total_videos || '?'} videos
                </span>
                <span style={{ fontSize: 11, color: C.amber, fontFamily: C.mono }}>
                  {job.progress || 0}%
                </span>
              </div>
              {job.current_file && (
                <div style={{ fontSize: 11, color: C.textMut, fontFamily: C.mono, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  ↓ {job.current_file}
                </div>
              )}
            </div>
          )}

          {/* Completed stats */}
          {job.status === 'completed' && (
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {[
                { label: 'Videos', value: job.downloaded_videos || 0 },
                { label: 'Size',   value: fmtMB(job.total_size_mb || 0) },
                { label: 'Done',   value: timeAgo(job.completed_at) },
              ].map(s => (
                <div key={s.label}>
                  <div style={{ fontSize: 10, color: C.textMut, fontFamily: C.mono, textTransform: 'uppercase' }}>{s.label}</div>
                  <div style={{ fontSize: 13, color: C.textPri, fontFamily: C.mono, fontWeight: 600 }}>{s.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {job.status === 'failed' && job.error_message && (
            <div style={{ fontSize: 12, color: C.red, fontFamily: C.mono, marginTop: 4 }}>
              {job.error_message}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexDirection: 'column' }}>
          {isActive && (
            <ActionBtn onClick={() => onCancel?.(job.id)} variant="danger">✕ Cancel</ActionBtn>
          )}
          {job.status === 'completed' && (
            <>
              <ActionBtn onClick={() => onToggleExpand?.(job.id)} variant={expanded ? 'active' : 'default'}>
                {expanded ? '▲ Hide' : '▼ Details'}
              </ActionBtn>
              <ActionBtn onClick={() => onAnalyze?.(job.id)} variant="teal">✦ Analyze</ActionBtn>
              <ActionBtn onClick={() => onCleanup?.(job.id)} variant="ghost">🗑 Files</ActionBtn>
            </>
          )}
          {(job.status === 'failed' || job.status === 'cancelled') && (
            <ActionBtn onClick={() => onDelete?.(job.id)} variant="ghost">Remove</ActionBtn>
          )}
        </div>
      </div>

      {/* Expanded: file list + analysis */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Analysis */}
          {analysis && <AnalysisPanel analysis={analysis} />}
          {!analysis && job.has_analysis === 1 && (
            <div style={{ fontSize: 12, color: C.textSec, fontFamily: C.mono }}>Loading analysis...</div>
          )}
        </div>
      )}
    </div>
  );
}

function ActionBtn({ onClick, children, variant = 'default' }) {
  const vars = {
    default: { bg: C.bgInput, color: C.textSec, border: C.border },
    active:  { bg: C.amber + '22', color: C.amber, border: C.amber + '55' },
    danger:  { bg: C.red + '11', color: C.red, border: C.red + '44' },
    teal:    { bg: C.teal + '11', color: C.teal, border: C.teal + '44' },
    ghost:   { bg: 'transparent', color: C.textMut, border: C.border },
  };
  const v = vars[variant] || vars.default;
  return (
    <button onClick={onClick} style={{
      background: v.bg, border: `1px solid ${v.border}`, borderRadius: 6,
      color: v.color, padding: '5px 12px', fontSize: 11,
      fontFamily: C.mono, cursor: 'pointer', whiteSpace: 'nowrap',
      transition: 'all .15s',
    }}>
      {children}
    </button>
  );
}

// ─── Analysis panel ───────────────────────────────────────────────────────────
function AnalysisPanel({ analysis: a }) {
  if (!a) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Content insight */}
      {a.contentInsight && (
        <div style={{ background: C.amber + '0D', border: `1px solid ${C.amber}33`, borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, color: C.amber, fontFamily: C.mono, textTransform: 'uppercase', marginBottom: 6 }}>✦ Content Insight</div>
          <p style={{ margin: 0, fontSize: 13, color: C.textPri, fontFamily: C.sans, lineHeight: 1.6 }}>{a.contentInsight}</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Label>Quick Stats</Label>
          {[
            { k: 'Upload Frequency',  v: a.uploadFrequency },
            { k: 'Avg Views',         v: a.avgViewCount ? a.avgViewCount.toLocaleString() : '—' },
            { k: 'Best Length',       v: a.bestPerformingLength },
          ].map(s => s.v && (
            <div key={s.k} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 10px', background: C.bg, borderRadius: 6, border: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 11, color: C.textSec, fontFamily: C.mono }}>{s.k}</span>
              <span style={{ fontSize: 11, color: C.textPri, fontFamily: C.mono, fontWeight: 600 }}>{s.v}</span>
            </div>
          ))}
        </div>

        {/* Topic clusters */}
        {a.topicClusters?.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Label>Topic Clusters</Label>
            {a.topicClusters.map((t, i) => (
              <div key={i} style={{
                padding: '7px 10px', background: C.teal + '11',
                border: `1px solid ${C.teal}33`, borderRadius: 6,
                fontSize: 12, color: C.teal, fontFamily: C.sans,
              }}>
                {t}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hook patterns */}
      {a.hookPatterns?.length > 0 && (
        <div>
          <Label>Hook Patterns</Label>
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {a.hookPatterns.map((h, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ color: C.amber, fontFamily: C.mono, fontSize: 12, flexShrink: 0 }}>#{i + 1}</span>
                <span style={{ fontSize: 13, color: C.textSec, fontFamily: C.sans }}>{h}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top performers */}
      {a.topPerformers?.length > 0 && (
        <div>
          <Label>Top Performers</Label>
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {a.topPerformers.slice(0, 5).map((v, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 12px', background: C.bg, borderRadius: 8, border: `1px solid ${C.border}`,
              }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flex: 1, minWidth: 0 }}>
                  <span style={{ color: C.amber, fontSize: 12, fontFamily: C.mono, flexShrink: 0 }}>#{i + 1}</span>
                  <span style={{ fontSize: 12, color: C.textPri, fontFamily: C.sans, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {v.title}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 12, flexShrink: 0, marginLeft: 10 }}>
                  <span style={{ fontSize: 11, color: C.textSec, fontFamily: C.mono }}>👁 {(v.views || 0).toLocaleString()}</span>
                  <span style={{ fontSize: 11, color: C.textSec, fontFamily: C.mono }}>❤ {(v.likes || 0).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TAB 2 — Queue ────────────────────────────────────────────────────────────
function QueueTab({ jobs, onCancel, onRefresh }) {
  const activeJobs = jobs.filter(j => j.status === 'running' || j.status === 'queued');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 900 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: C.textSec, fontFamily: C.mono }}>
          {activeJobs.length} active {activeJobs.length === 1 ? 'job' : 'jobs'}
        </span>
        <ActionBtn onClick={onRefresh} variant="ghost">↺ Refresh</ActionBtn>
      </div>

      {activeJobs.length === 0 ? (
        <div style={{
          background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12,
          padding: '48px 24px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⬇</div>
          <div style={{ fontSize: 14, color: C.textSec, fontFamily: C.sans }}>No active downloads</div>
          <div style={{ fontSize: 12, color: C.textMut, fontFamily: C.mono, marginTop: 4 }}>
            Paste a URL in the Download tab to get started
          </div>
        </div>
      ) : (
        activeJobs.map(job => (
          <JobCard key={job.id} job={job} onCancel={onCancel} />
        ))
      )}
    </div>
  );
}

// ─── TAB 3 — Library ──────────────────────────────────────────────────────────
function LibraryTab({ jobs, onDelete, onCleanup }) {
  const [expanded, setExpanded] = useState({});
  const [analyses, setAnalyses] = useState({});
  const [analyzing, setAnalyzing] = useState({});

  const completedJobs = jobs.filter(j => j.status === 'completed');
  const failedJobs    = jobs.filter(j => j.status === 'failed' || j.status === 'cancelled');

  const toggleExpand = (jobId) => {
    setExpanded(prev => ({ ...prev, [jobId]: !prev[jobId] }));
  };

  const handleAnalyze = async (jobId) => {
    setAnalyzing(prev => ({ ...prev, [jobId]: true }));
    try {
      const data = await api(`/analysis/${jobId}`);
      setAnalyses(prev => ({ ...prev, [jobId]: data.analysis }));
      setExpanded(prev => ({ ...prev, [jobId]: true }));
    } catch (e) {
      // Try to trigger fresh analysis
      try {
        const data = await api(`/analyze/${jobId}`, { method: 'POST' });
        setAnalyses(prev => ({ ...prev, [jobId]: data.analysis }));
        setExpanded(prev => ({ ...prev, [jobId]: true }));
      } catch {}
    } finally {
      setAnalyzing(prev => ({ ...prev, [jobId]: false }));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 900 }}>

      {/* Completed */}
      <div>
        <div style={{ marginBottom: 12 }}>
          <Label>Completed Downloads ({completedJobs.length})</Label>
        </div>
        {completedJobs.length === 0 ? (
          <div style={{
            background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12,
            padding: '32px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 13, color: C.textSec, fontFamily: C.mono }}>No completed downloads yet</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {completedJobs.map(job => (
              <JobCard
                key={job.id}
                job={job}
                expanded={expanded[job.id]}
                onToggleExpand={toggleExpand}
                onAnalyze={analyzing[job.id] ? undefined : handleAnalyze}
                onDelete={onDelete}
                onCleanup={onCleanup}
                analysis={analyses[job.id]}
              />
            ))}
          </div>
        )}
      </div>

      {/* Failed/cancelled */}
      {failedJobs.length > 0 && (
        <div>
          <div style={{ marginBottom: 12 }}>
            <Label>Failed / Cancelled ({failedJobs.length})</Label>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {failedJobs.map(job => (
              <JobCard key={job.id} job={job} onDelete={onDelete} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TAB 4 — Settings ─────────────────────────────────────────────────────────
function SettingsTab() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api('/storage-stats').then(setStats).catch(() => {});
  }, []);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 800 }}>

      {/* Storage */}
      <Section title="Storage">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {stats ? (
            <>
              <div>
                <div style={{ fontSize: 28, fontWeight: 700, color: C.amber, fontFamily: C.mono }}>
                  {fmtMB(stats.totalStorageMB)}
                </div>
                <div style={{ fontSize: 12, color: C.textSec, fontFamily: C.mono }}>
                  used across {stats.jobCount} jobs
                </div>
              </div>
              <div style={{ fontSize: 12, color: C.textMut, fontFamily: C.mono }}>
                Path: {stats.downloadsPath}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 13, color: C.textMut, fontFamily: C.mono }}>Loading...</div>
          )}
        </div>
      </Section>

      {/* Tool version */}
      <Section title="yt-dlp">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 13, color: C.teal, fontFamily: C.mono }}>
            Version: {stats?.ytdlpVersion || '...'}
          </div>
          <div style={{ fontSize: 12, color: C.textSec, fontFamily: C.mono, lineHeight: 1.6 }}>
            yt-dlp handles all platform downloads. It's pre-installed in the CCC OS Docker image on Railway.
          </div>
        </div>
      </Section>

      {/* Platform support */}
      <Section title="Platform Support">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Object.entries(PLATFORMS).map(([key, p]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: C.bg, borderRadius: 8, border: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 16 }}>{p.icon}</span>
                <span style={{ fontSize: 13, color: C.textPri, fontFamily: C.sans }}>{p.label}</span>
              </div>
              <span style={{ fontSize: 11, color: C.green, fontFamily: C.mono }}>✓ Active</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Limits */}
      <Section title="Download Limits">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { label: 'Max concurrent jobs', value: '3' },
            { label: 'Max videos per job', value: '100' },
            { label: 'Storage location', value: '/data/downloads/' },
            { label: 'Supported formats', value: 'MP4, MP3, MKV' },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 10px', background: C.bg, borderRadius: 6, border: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 11, color: C.textSec, fontFamily: C.mono }}>{s.label}</span>
              <span style={{ fontSize: 11, color: C.textPri, fontFamily: C.mono, fontWeight: 600 }}>{s.value}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ChannelDownloader() {
  const [activeTab, setActiveTab] = useState('download');
  const [jobs, setJobs] = useState([]);
  const pollRef = useRef(null);

  const loadJobs = useCallback(async () => {
    try {
      const data = await api('/jobs');
      setJobs(data.jobs || []);
    } catch {}
  }, []);

  // Initial load + polling every 4s
  useEffect(() => {
    loadJobs();
    pollRef.current = setInterval(loadJobs, 4000);
    return () => clearInterval(pollRef.current);
  }, [loadJobs]);

  const handleCancel = async (jobId) => {
    await api(`/cancel/${jobId}`, { method: 'POST' });
    loadJobs();
  };

  const handleDelete = async (jobId) => {
    await api(`/job/${jobId}`, { method: 'DELETE' });
    loadJobs();
  };

  const handleCleanup = async (jobId) => {
    if (!window.confirm('Delete downloaded files from disk? The job record will remain.')) return;
    await api(`/cleanup/${jobId}`, { method: 'POST' });
    loadJobs();
  };

  const activeCount  = jobs.filter(j => j.status === 'running' || j.status === 'queued').length;
  const libraryCount = jobs.filter(j => j.status === 'completed').length;

  const tabs = [
    { id: 'download', icon: '⬇', label: 'Download' },
    { id: 'queue',    icon: '⟳', label: 'Queue',   badge: activeCount  },
    { id: 'library',  icon: '📁', label: 'Library', badge: 0            },
    { id: 'settings', icon: '⚙', label: 'Settings'                      },
  ];

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.textPri, fontFamily: C.sans, padding: 32 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300;1,400&display=swap');
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.3; } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        * { box-sizing: border-box; }
        input[type=range] { height: 4px; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: ${C.bg}; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
        select option { background: ${C.bgCard}; color: ${C.textPri}; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 32, animation: 'fadeIn .4s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: `linear-gradient(135deg, ${C.amber}, ${C.amberDim})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, boxShadow: `0 0 28px ${C.amber}33`,
          }}>⬇</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.textPri, letterSpacing: '-0.02em' }}>
              Channel Downloader
            </h1>
            <p style={{ margin: 0, fontSize: 12, color: C.textSec, fontFamily: C.mono }}>
              Bulk download TikTok pages · Instagram profiles · YouTube channels
            </p>
          </div>

          {/* Live active count */}
          {activeCount > 0 && (
            <div style={{
              marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8,
              background: C.amber + '11', border: `1px solid ${C.amber}33`,
              borderRadius: 99, padding: '6px 14px',
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.amber, animation: 'pulse 1.5s infinite' }} />
              <span style={{ fontSize: 12, color: C.amber, fontFamily: C.mono }}>
                {activeCount} downloading
              </span>
            </div>
          )}
        </div>

        {/* Summary row */}
        <div style={{ display: 'flex', gap: 14 }}>
          {[
            { label: 'TikTok',    sub: 'Public pages',     icon: '🎵' },
            { label: 'Instagram', sub: 'Public profiles',  icon: '📷' },
            { label: 'YouTube',   sub: 'Channels + lists', icon: '▶️' },
            { label: 'AI Insights', sub: 'Claude analysis', icon: '✦' },
          ].map(s => (
            <div key={s.label} style={{
              flex: 1, background: C.bgCard, borderRadius: 10, padding: '12px 14px',
              border: `1px solid ${C.border}`,
            }}>
              <div style={{ fontSize: 11, color: C.textSec, fontFamily: C.mono, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.icon} {s.label}</div>
              <div style={{ fontSize: 12, color: C.amberDim, fontFamily: C.mono, marginTop: 4 }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 4, background: C.bgCard, borderRadius: 10,
        padding: 4, width: 'fit-content', marginBottom: 28, border: `1px solid ${C.border}`,
      }}>
        {tabs.map(t => (
          <TabBtn key={t.id} active={activeTab === t.id} onClick={() => setActiveTab(t.id)}
            icon={t.icon} label={t.label} badge={t.badge} />
        ))}
      </div>

      {/* Tab content */}
      <div style={{ animation: 'fadeIn .25s ease' }}>
        {activeTab === 'download' && <DownloadTab onJobStarted={() => { loadJobs(); setActiveTab('queue'); }} />}
        {activeTab === 'queue'    && <QueueTab jobs={jobs} onCancel={handleCancel} onRefresh={loadJobs} />}
        {activeTab === 'library'  && <LibraryTab jobs={jobs} onDelete={handleDelete} onCleanup={handleCleanup} />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>
    </div>
  );
}
