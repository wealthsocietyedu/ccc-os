import { useState, useRef } from 'react';

const API_BASE = '/api/video-downloader';

// ─── Platform config ──────────────────────────────────────────────────────────
const PLATFORMS = {
  tiktok: { name: 'TikTok', icon: '🎵', color: '#010101', accent: '#FE2C55' },
  instagram: { name: 'Instagram', icon: '📸', color: '#833AB4', accent: '#E1306C' },
  youtube: { name: 'YouTube', icon: '▶️', color: '#FF0000', accent: '#FF0000' },
  twitter: { name: 'Twitter / X', icon: '𝕏', color: '#1DA1F2', accent: '#1DA1F2' },
  facebook: { name: 'Facebook', icon: '📘', color: '#1877F2', accent: '#1877F2' },
  pinterest: { name: 'Pinterest', icon: '📌', color: '#E60023', accent: '#E60023' },
  unknown: { name: 'Video', icon: '🎬', color: '#7C3AED', accent: '#7C3AED' }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function detectPlatform(url) {
  if (!url) return 'unknown';
  if (url.includes('tiktok.com')) return 'tiktok';
  if (url.includes('instagram.com')) return 'instagram';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
  if (url.includes('facebook.com') || url.includes('fb.watch')) return 'facebook';
  if (url.includes('pinterest.com')) return 'pinterest';
  return 'unknown';
}

function formatViews(n) {
  if (!n) return null;
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M views`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K views`;
  return `${n} views`;
}

function formatDate(d) {
  if (!d) return null;
  const y = d.slice(0, 4), m = d.slice(4, 6), day = d.slice(6, 8);
  return new Date(`${y}-${m}-${day}`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── URL Paste Input ──────────────────────────────────────────────────────────
function PasteInput({ value, onChange, onFetch, loading }) {
  const inputRef = useRef(null);
  const platform = detectPlatform(value);
  const p = PLATFORMS[platform];

  const handlePaste = async (e) => {
    const pasted = e.clipboardData.getData('text').trim();
    onChange(pasted);
    // Auto-fetch on paste if it looks like a URL
    if (pasted.startsWith('http')) {
      setTimeout(() => onFetch(pasted), 100);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && value.trim()) onFetch(value);
  };

  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        background: '#0D0D1A', border: `1.5px solid ${value ? p.accent : '#2D2D44'}`,
        borderRadius: '14px', padding: '14px 18px', transition: 'border-color 0.2s'
      }}>
        {/* Platform icon */}
        <div style={{
          width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
          background: value ? `${p.accent}20` : '#1A1A2E',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '20px', transition: 'all 0.2s'
        }}>
          {value ? p.icon : '🔗'}
        </div>

        {/* Input */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '11px', color: '#4B5563', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
            {value ? p.name : 'Paste video URL'}
          </div>
          <input
            ref={inputRef}
            value={value}
            onChange={e => onChange(e.target.value)}
            onPaste={handlePaste}
            onKeyDown={handleKeyDown}
            placeholder="https://www.tiktok.com/@username/video/..."
            style={{
              background: 'none', border: 'none', outline: 'none', width: '100%',
              color: '#E5E7EB', fontSize: '13px', fontFamily: 'DM Mono, monospace',
              caretColor: '#7C3AED'
            }}
          />
        </div>

        {/* Clear button */}
        {value && (
          <button
            onClick={() => onChange('')}
            style={{ background: 'none', border: 'none', color: '#4B5563', cursor: 'pointer', fontSize: '18px', padding: '4px', lineHeight: 1 }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Supported platforms hint */}
      {!value && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
          {['TikTok 🎵', 'Instagram 📸', 'YouTube ▶️', 'Twitter 𝕏', 'Facebook 📘'].map(p => (
            <span key={p} style={{ fontSize: '11px', color: '#4B5563', fontFamily: 'DM Mono, monospace', background: '#1A1A2E', borderRadius: '6px', padding: '3px 8px', border: '1px solid #2D2D44' }}>
              {p}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Video Preview Card ───────────────────────────────────────────────────────
function VideoPreview({ info, url }) {
  const platform = detectPlatform(url);
  const p = PLATFORMS[platform];

  return (
    <div style={{
      background: '#0D0D1A', border: `1px solid ${p.accent}40`,
      borderRadius: '14px', overflow: 'hidden', animation: 'fadeIn 0.3s ease'
    }}>
      {/* Platform badge */}
      <div style={{
        background: `${p.accent}15`, borderBottom: `1px solid ${p.accent}30`,
        padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px'
      }}>
        <span style={{ fontSize: '16px' }}>{p.icon}</span>
        <span style={{ fontSize: '12px', color: p.accent, fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '600' }}>
          {p.name}
        </span>
        {info.duration && (
          <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#6B7280', fontFamily: 'DM Mono, monospace' }}>
            ⏱ {info.duration}
          </span>
        )}
      </div>

      <div style={{ padding: '16px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        {/* Thumbnail */}
        {info.thumbnail && (
          <div style={{ flexShrink: 0, width: '120px' }}>
            <img
              src={info.thumbnail}
              alt="Thumbnail"
              style={{ width: '120px', aspectRatio: '16/9', objectFit: 'cover', borderRadius: '8px' }}
              onError={e => { e.target.style.display = 'none'; }}
            />
          </div>
        )}

        {/* Meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ margin: '0 0 8px', fontSize: '14px', color: '#fff', fontWeight: '600', fontFamily: 'Sora, sans-serif', lineHeight: '1.4', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {info.title}
          </h3>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {info.uploader && (
              <span style={{ fontSize: '12px', color: '#9CA3AF', fontFamily: 'DM Mono, monospace' }}>
                @{info.uploader}
              </span>
            )}
            {info.viewCount && (
              <span style={{ fontSize: '12px', color: '#6B7280', fontFamily: 'DM Mono, monospace' }}>
                {formatViews(info.viewCount)}
              </span>
            )}
            {info.uploadDate && (
              <span style={{ fontSize: '12px', color: '#6B7280', fontFamily: 'DM Mono, monospace' }}>
                {formatDate(info.uploadDate)}
              </span>
            )}
          </div>
          {info.description && (
            <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#4B5563', fontFamily: 'Sora, sans-serif', lineHeight: '1.5', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {info.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Download Options ─────────────────────────────────────────────────────────
function DownloadOptions({ quality, setQuality, audioOnly, setAudioOnly, onDownload, loading, progress }) {
  const qualityOptions = [
    { value: 'best', label: 'Best Quality', sub: 'Highest available' },
    { value: '1080p', label: '1080p HD', sub: 'Full HD' },
    { value: '720p', label: '720p HD', sub: 'HD Ready' },
    { value: '480p', label: '480p SD', sub: 'Smaller file' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Format toggle */}
      <div>
        <div style={{ fontSize: '11px', color: '#6B7280', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
          Format
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {[
            { id: false, icon: '🎬', label: 'Video (MP4)', sub: 'With audio' },
            { id: true, icon: '🎵', label: 'Audio Only', sub: 'MP3 format' }
          ].map(opt => (
            <div
              key={String(opt.id)}
              onClick={() => setAudioOnly(opt.id)}
              style={{
                background: audioOnly === opt.id ? '#1A0A2E' : '#1A1A2E',
                border: `1px solid ${audioOnly === opt.id ? '#7C3AED' : '#2D2D44'}`,
                borderRadius: '10px', padding: '12px', cursor: 'pointer', transition: 'all 0.15s'
              }}
            >
              <div style={{ fontSize: '20px', marginBottom: '4px' }}>{opt.icon}</div>
              <div style={{ fontSize: '13px', color: audioOnly === opt.id ? '#E5E7EB' : '#9CA3AF', fontFamily: 'Sora, sans-serif', fontWeight: '500' }}>{opt.label}</div>
              <div style={{ fontSize: '11px', color: '#4B5563', fontFamily: 'DM Mono, monospace' }}>{opt.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quality selector (video only) */}
      {!audioOnly && (
        <div>
          <div style={{ fontSize: '11px', color: '#6B7280', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
            Quality
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {qualityOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setQuality(opt.value)}
                style={{
                  background: quality === opt.value ? '#7C3AED' : '#1A1A2E',
                  border: `1px solid ${quality === opt.value ? '#7C3AED' : '#2D2D44'}`,
                  borderRadius: '8px', color: quality === opt.value ? '#fff' : '#9CA3AF',
                  padding: '8px 14px', fontSize: '12px', cursor: 'pointer',
                  fontFamily: 'DM Mono, monospace', transition: 'all 0.15s'
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Download button */}
      <button
        onClick={onDownload}
        disabled={loading}
        style={{
          background: loading ? '#4C1D95' : 'linear-gradient(135deg, #7C3AED, #4F46E5)',
          border: 'none', borderRadius: '12px', color: '#fff',
          padding: '14px 28px', fontSize: '15px', fontWeight: '700',
          fontFamily: 'Sora, sans-serif', cursor: loading ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
          transition: 'all 0.2s', opacity: loading ? 0.8 : 1,
          boxShadow: loading ? 'none' : '0 0 24px rgba(124,58,237,0.45)',
          letterSpacing: '0.02em'
        }}
      >
        {loading ? (
          <>
            <div style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            Downloading...
          </>
        ) : (
          <>
            ↓ Download {audioOnly ? 'Audio' : 'Video'}
          </>
        )}
      </button>

      {/* Progress indicator */}
      {loading && (
        <div style={{ background: '#1A1A2E', borderRadius: '8px', padding: '12px 16px', border: '1px solid #2D2D44' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#7C3AED', animation: 'pulse 1.5s ease infinite' }} />
            <span style={{ fontSize: '12px', color: '#9CA3AF', fontFamily: 'DM Mono, monospace' }}>
              {progress || 'Fetching video from server...'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Download History Item ────────────────────────────────────────────────────
function HistoryItem({ item }) {
  const p = PLATFORMS[item.platform] || PLATFORMS.unknown;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: '#1A1A2E', borderRadius: '10px', border: '1px solid #2D2D44' }}>
      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${p.accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
        {p.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', color: '#E5E7EB', fontFamily: 'Sora, sans-serif', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.title}
        </div>
        <div style={{ fontSize: '11px', color: '#4B5563', fontFamily: 'DM Mono, monospace', marginTop: '2px' }}>
          {p.name} · {item.quality} · {new Date(item.timestamp).toLocaleTimeString()}
        </div>
      </div>
      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4ADE80', flexShrink: 0 }} />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function VideoDownloader() {
  const [url, setUrl] = useState('');
  const [videoInfo, setVideoInfo] = useState(null);
  const [infoLoading, setInfoLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [quality, setQuality] = useState('best');
  const [audioOnly, setAudioOnly] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');
  const [history, setHistory] = useState([]);
  const [successMsg, setSuccessMsg] = useState('');

  const handleFetchInfo = async (targetUrl) => {
    const cleanUrl = (targetUrl || url).trim();
    if (!cleanUrl || !cleanUrl.startsWith('http')) return;

    setInfoLoading(true);
    setError('');
    setVideoInfo(null);
    setSuccessMsg('');

    try {
      const res = await fetch(`${API_BASE}/info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: cleanUrl })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch video info');
      setVideoInfo(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setInfoLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!url.trim()) return;

    setDownloadLoading(true);
    setError('');
    setSuccessMsg('');
    setProgress('Connecting to server...');

    try {
      setProgress('Downloading video from source...');

      const res = await fetch(`${API_BASE}/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), quality, audioOnly })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Download failed');
      }

      setProgress('Saving file to your device...');

      // Trigger browser download
      const blob = await res.blob();
      const contentDisposition = res.headers.get('content-disposition') || '';
      const filenameMatch = contentDisposition.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : `ccc-os-video.${audioOnly ? 'mp3' : 'mp4'}`;

      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);

      // Add to history
      const platform = detectPlatform(url);
      const historyItem = {
        id: Date.now(),
        title: videoInfo?.title || 'Downloaded Video',
        platform,
        quality: audioOnly ? 'Audio' : quality,
        timestamp: Date.now()
      };
      setHistory(prev => [historyItem, ...prev].slice(0, 10));
      setSuccessMsg(`✓ Downloaded successfully — check your Downloads folder`);

    } catch (e) {
      setError(e.message);
    } finally {
      setDownloadLoading(false);
      setProgress('');
    }
  };

  const handleUrlChange = (newUrl) => {
    setUrl(newUrl);
    setVideoInfo(null);
    setError('');
    setSuccessMsg('');
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#0C0A07', color: '#E5E7EB',
      fontFamily: 'Sora, sans-serif', padding: '32px'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300;1,400&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0C0A07; }
        ::-webkit-scrollbar-thumb { background: #2D2D44; border-radius: 3px; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: '36px', animation: 'fadeIn 0.4s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '6px' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '14px',
            background: 'linear-gradient(135deg, #F0A800, #D4953A)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px',
            boxShadow: '0 0 28px rgba(240,168,0,0.35)'
          }}>
            ↓
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '700', color: '#fff', letterSpacing: '-0.02em' }}>
              Video Downloader
            </h1>
            <p style={{ margin: 0, fontSize: '13px', color: '#6B7280', fontFamily: 'DM Mono, monospace' }}>
              TikTok · Instagram · YouTube · Twitter · Facebook
            </p>
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '28px', maxWidth: '1100px' }}>

        {/* Left: URL Input + Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* URL Input */}
          <div style={{ background: '#131108', border: '1px solid #2A2510', borderRadius: '16px', padding: '20px' }}>
            <div style={{ fontSize: '11px', color: '#F0A800', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px' }}>
              ✦ Step 1 — Paste your link
            </div>
            <PasteInput
              value={url}
              onChange={handleUrlChange}
              onFetch={handleFetchInfo}
              loading={infoLoading}
            />

            {url && !videoInfo && !infoLoading && (
              <button
                onClick={() => handleFetchInfo(url)}
                style={{
                  marginTop: '12px', background: '#1A1A2E', border: '1px solid #F0A800',
                  borderRadius: '10px', color: '#F0A800', padding: '10px 20px',
                  fontSize: '13px', cursor: 'pointer', fontFamily: 'DM Mono, monospace',
                  display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
                  justifyContent: 'center'
                }}
              >
                {infoLoading ? (
                  <>
                    <div style={{ width: '14px', height: '14px', border: '2px solid rgba(240,168,0,0.3)', borderTopColor: '#F0A800', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    Fetching info...
                  </>
                ) : (
                  <>🔍 Fetch Video Info</>
                )}
              </button>
            )}

            {infoLoading && (
              <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: '#1A1A2E', borderRadius: '8px' }}>
                <div style={{ width: '16px', height: '16px', border: '2px solid rgba(240,168,0,0.3)', borderTopColor: '#F0A800', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <span style={{ fontSize: '12px', color: '#9CA3AF', fontFamily: 'DM Mono, monospace' }}>Fetching video info...</span>
              </div>
            )}
          </div>

          {/* Video Preview */}
          {videoInfo && (
            <VideoPreview info={videoInfo} url={url} />
          )}

          {/* Error */}
          {error && (
            <div style={{ background: '#1F0A0A', border: '1px solid #7F1D1D', borderRadius: '12px', padding: '14px 18px', display: 'flex', gap: '12px', alignItems: 'flex-start', animation: 'fadeIn 0.3s ease' }}>
              <span style={{ fontSize: '18px', flexShrink: 0 }}>⚠️</span>
              <div>
                <div style={{ fontSize: '13px', color: '#FCA5A5', fontFamily: 'Sora, sans-serif', fontWeight: '500', marginBottom: '4px' }}>Download Error</div>
                <div style={{ fontSize: '12px', color: '#EF4444', fontFamily: 'DM Mono, monospace', lineHeight: '1.5' }}>{error}</div>
              </div>
            </div>
          )}

          {/* Success */}
          {successMsg && (
            <div style={{ background: '#0A1F0A', border: '1px solid #1A5C1A', borderRadius: '12px', padding: '14px 18px', display: 'flex', gap: '12px', alignItems: 'center', animation: 'fadeIn 0.3s ease' }}>
              <span style={{ fontSize: '20px' }}>✅</span>
              <span style={{ fontSize: '13px', color: '#4ADE80', fontFamily: 'Sora, sans-serif' }}>{successMsg}</span>
            </div>
          )}

          {/* Download history */}
          {history.length > 0 && (
            <div style={{ background: '#131108', border: '1px solid #2A2510', borderRadius: '16px', padding: '20px' }}>
              <div style={{ fontSize: '11px', color: '#6B7280', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
                Recent Downloads
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {history.map(item => (
                  <HistoryItem key={item.id} item={item} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Download Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: '#131108', border: '1px solid #2A2510', borderRadius: '16px', padding: '20px' }}>
            <div style={{ fontSize: '11px', color: '#F0A800', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>
              ✦ Step 2 — Download
            </div>
            <DownloadOptions
              quality={quality}
              setQuality={setQuality}
              audioOnly={audioOnly}
              setAudioOnly={setAudioOnly}
              onDownload={handleDownload}
              loading={downloadLoading}
              progress={progress}
            />
          </div>

          {/* How to use */}
          <div style={{ background: '#0D0D1A', border: '1px solid #2D2D44', borderRadius: '16px', padding: '20px' }}>
            <div style={{ fontSize: '11px', color: '#6B7280', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '14px' }}>
              How to use
            </div>
            {[
              { step: '1', text: 'Open the video on TikTok, Instagram, or YouTube' },
              { step: '2', text: 'Copy the URL from your browser address bar or the Share button' },
              { step: '3', text: 'Paste it into the input above — info loads automatically' },
              { step: '4', text: 'Choose quality and format, then hit Download' },
              { step: '5', text: 'File saves directly to your Downloads folder' }
            ].map(({ step, text }) => (
              <div key={step} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#1A1A2E', border: '1px solid #F0A800', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#F0A800', fontFamily: 'DM Mono, monospace', flexShrink: 0, marginTop: '1px' }}>
                  {step}
                </div>
                <span style={{ fontSize: '12px', color: '#9CA3AF', fontFamily: 'Sora, sans-serif', lineHeight: '1.5' }}>{text}</span>
              </div>
            ))}

            {/* Disclaimer */}
            <div style={{ marginTop: '16px', padding: '10px 12px', background: '#0C0A07', border: '1px solid #2A2510', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: '#4B5563', fontFamily: 'DM Mono, monospace', lineHeight: '1.5' }}>
                ℹ️ For personal use and content research only. Respect copyright and platform terms of service.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
