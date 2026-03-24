import { useState, useRef } from 'react';

const API_BASE = '/api/ai-studio';
import AIStudio from './components/AIStudio';
import VisualEngine from './components/VisualEngine';
import SmartClipper from './components/SmartClipper';
// ─── Shared fetch helper ──────────────────────────────────────────────────────
async function apiFetch(endpoint, body) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TabButton({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '10px 20px', borderRadius: '8px', border: 'none',
        cursor: 'pointer', fontSize: '14px', fontFamily: 'Sora, sans-serif',
        fontWeight: active ? '600' : '400',
        background: active ? '#F0A800' : 'transparent',
        color: active ? '#0F0D0A' : '#A89880',
        transition: 'all 0.2s'
      }}
    >
      <span>{icon}</span>
      {label}
    </button>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '12px', color: '#A89880', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          background: '#1A1610', border: '1px solid #3D3428', borderRadius: '8px',
          color: '#F0EBE0', padding: '10px 12px', fontSize: '14px',
          fontFamily: 'Sora, sans-serif', cursor: 'pointer', outline: 'none',
          appearance: 'none'
        }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function TextInput({ label, value, onChange, placeholder, multiline, rows = 3 }) {
  const commonStyle = {
    background: '#1A1610', border: '1px solid #3D3428', borderRadius: '8px',
    color: '#F0EBE0', padding: '10px 12px', fontSize: '14px',
    fontFamily: 'Sora, sans-serif', outline: 'none', width: '100%',
    boxSizing: 'border-box', resize: multiline ? 'vertical' : 'none'
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {label && (
        <label style={{ fontSize: '12px', color: '#A89880', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {label}
        </label>
      )}
      {multiline
        ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} style={commonStyle} />
        : <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={commonStyle} />
      }
    </div>
  );
}

function CopyButton({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      style={{
        background: copied ? '#2E7A6E' : '#3D3428', border: 'none', borderRadius: '6px',
        color: copied ? '#fff' : '#A89880', padding: '6px 12px', fontSize: '12px',
        fontFamily: 'DM Mono, monospace', cursor: 'pointer', transition: 'all 0.2s'
      }}
    >
      {copied ? '✓ Copied' : label}
    </button>
  );
}

function GenerateButton({ onClick, loading, label = 'Generate', icon = '✦' }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        background: loading ? '#7A5820' : 'linear-gradient(135deg, #D4953A, #F0A800)',
        border: 'none', borderRadius: '10px', color: loading ? '#A89880' : '#0F0D0A',
        padding: '12px 24px', fontSize: '14px', fontWeight: '600',
        fontFamily: 'Sora, sans-serif', cursor: loading ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', gap: '8px',
        transition: 'all 0.2s', opacity: loading ? 0.7 : 1,
        boxShadow: loading ? 'none' : '0 0 20px rgba(212,149,58,0.3)'
      }}
    >
      <span style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}>
        {loading ? '⟳' : icon}
      </span>
      {loading ? 'Generating...' : label}
    </button>
  );
}

// ─── Image Generator Tab ──────────────────────────────────────────────────────
function ImageGenerator() {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('photorealistic');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [enhance, setEnhance] = useState(true);
  const [loading, setLoading] = useState(false);
  const [variationsLoading, setVariationsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [variations, setVariations] = useState([]);
  const [error, setError] = useState('');
  const [activeImage, setActiveImage] = useState(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true); setError(''); setResult(null); setVariations([]);
    try {
      const data = await apiFetch('/generate-image', { prompt, style, aspectRatio, enhance });
      setResult(data);
      setActiveImage(data.imageUrl);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVariations = async () => {
    if (!prompt.trim()) return;
    setVariationsLoading(true); setError('');
    try {
      const data = await apiFetch('/generate-variations', { prompt, style, aspectRatio, count: 4 });
      setVariations(data.variations);
      if (data.variations[0]) setActiveImage(data.variations[0].imageUrl);
    } catch (e) {
      setError(e.message);
    } finally {
      setVariationsLoading(false);
    }
  };

  const styleOptions = [
    { value: 'photorealistic', label: '📷 Photorealistic' },
    { value: 'cinematic', label: '🎬 Cinematic' },
    { value: 'artistic', label: '🎨 Artistic / Digital Art' },
    { value: 'minimal', label: '⬜ Minimal / Clean' },
    { value: 'dark', label: '🌑 Dark & Moody' },
    { value: 'vibrant', label: '🌈 Vibrant & Bold' }
  ];

  const aspectOptions = [
    { value: '16:9', label: '16:9 — YouTube / Landscape' },
    { value: '9:16', label: '9:16 — Reels / TikTok' },
    { value: '1:1', label: '1:1 — Square / Instagram' },
    { value: '4:3', label: '4:3 — Standard' }
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '24px', minHeight: '600px' }}>
      {/* Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <TextInput
          label="Image Prompt"
          value={prompt}
          onChange={setPrompt}
          placeholder="Person typing on a laptop in a dark minimal office, soft desk lamp..."
          multiline
          rows={4}
        />
        <Select label="Style" value={style} onChange={setStyle} options={styleOptions} />
        <Select label="Aspect Ratio" value={aspectRatio} onChange={setAspectRatio} options={aspectOptions} />

        {/* Enhance toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: '#1A1610', borderRadius: '8px', border: '1px solid #3D3428' }}>
          <div>
            <div style={{ fontSize: '14px', color: '#F0EBE0', fontFamily: 'Sora, sans-serif' }}>AI Enhance Prompt</div>
            <div style={{ fontSize: '12px', color: '#6B5E4E', fontFamily: 'DM Mono, monospace' }}>Claude upgrades your prompt</div>
          </div>
          <div
            onClick={() => setEnhance(!enhance)}
            style={{
              width: '44px', height: '24px', borderRadius: '12px', cursor: 'pointer',
              background: enhance ? '#F0A800' : '#3D3428', position: 'relative', transition: 'background 0.2s'
            }}
          >
            <div style={{
              position: 'absolute', top: '2px', left: enhance ? '22px' : '2px',
              width: '20px', height: '20px', borderRadius: '50%', background: '#fff',
              transition: 'left 0.2s'
            }} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <GenerateButton onClick={handleGenerate} loading={loading} label="Generate Image" icon="🎨" />
          <button
            onClick={handleVariations}
            disabled={variationsLoading || !prompt.trim()}
            style={{
              background: '#1A1610', border: '1px solid #8C6A2A', borderRadius: '10px',
              color: '#FCD97A', padding: '12px 24px', fontSize: '14px',
              fontFamily: 'Sora, sans-serif', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}
          >
            {variationsLoading ? '⟳ Generating...' : '⊞ Generate 4 Variations'}
          </button>
        </div>

        {error && (
          <div style={{ background: '#2A0A0A', border: '1px solid #C42A18', borderRadius: '8px', padding: '12px', color: '#F87060', fontSize: '13px', fontFamily: 'DM Mono, monospace' }}>
            {error}
          </div>
        )}

        {/* Provider badge */}
        <div style={{ padding: '10px 12px', background: '#0F1A14', border: '1px solid #1E5050', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>🆓</span>
          <div>
            <div style={{ fontSize: '12px', color: '#6ECFBF', fontFamily: 'DM Mono, monospace' }}>Powered by Pollinations AI</div>
            <div style={{ fontSize: '11px', color: '#3D3428', fontFamily: 'DM Mono, monospace' }}>Free • No limits • No API key</div>
          </div>
        </div>
      </div>

      {/* Output */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Main image display */}
        <div style={{
          background: '#0F0D0A', border: '1px solid #3D3428', borderRadius: '12px',
          minHeight: '380px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', position: 'relative'
        }}>
          {activeImage ? (
            <>
              <img
                src={activeImage}
                alt="Generated"
                style={{ width: '100%', height: '100%', objectFit: 'contain', maxHeight: '500px' }}
                onError={e => { e.target.style.display = 'none'; }}
              />
              <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '8px' }}>
                <a href={activeImage} download="ccc-os-generated.jpg" style={{ textDecoration: 'none' }}>
                  <button style={{ background: 'rgba(0,0,0,0.7)', border: '1px solid #5C4E38', borderRadius: '6px', color: '#F0EBE0', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', fontFamily: 'DM Mono, monospace' }}>
                    ↓ Save
                  </button>
                </a>
                <CopyButton text={activeImage} label="Copy URL" />
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', color: '#5C4E38' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎨</div>
              <div style={{ fontSize: '14px', fontFamily: 'Sora, sans-serif' }}>Your generated image will appear here</div>
              <div style={{ fontSize: '12px', fontFamily: 'DM Mono, monospace', marginTop: '6px', color: '#3D3428' }}>Enter a prompt and click Generate</div>
            </div>
          )}
          {(loading) && (
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(13,13,26,0.85)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px'
            }}>
              <div style={{ width: '48px', height: '48px', border: '3px solid #F0A800', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <div style={{ color: '#FCD97A', fontSize: '14px', fontFamily: 'Sora, sans-serif' }}>Generating your image...</div>
              <div style={{ color: '#6B5E4E', fontSize: '12px', fontFamily: 'DM Mono, monospace' }}>This may take 10-20 seconds</div>
            </div>
          )}
        </div>

        {/* Variations grid */}
        {variations.length > 0 && (
          <div>
            <div style={{ fontSize: '12px', color: '#A89880', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
              Variations — click to select
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              {variations.map(v => (
                <div
                  key={v.id}
                  onClick={() => setActiveImage(v.imageUrl)}
                  style={{
                    borderRadius: '8px', overflow: 'hidden', cursor: 'pointer',
                    border: activeImage === v.imageUrl ? '2px solid #F0A800' : '2px solid transparent',
                    transition: 'border-color 0.2s', aspectRatio: '1'
                  }}
                >
                  <img src={v.imageUrl} alt={`Variation ${v.id}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Enhanced prompt display */}
        {result?.enhancedPrompt && result.enhancedPrompt !== result.originalPrompt && (
          <div style={{ background: '#120F0B', border: '1px solid #3D3428', borderRadius: '10px', padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: '#D4953A', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase' }}>✦ AI Enhanced Prompt</span>
              <CopyButton text={result.enhancedPrompt} label="Copy" />
            </div>
            <p style={{ color: '#A89880', fontSize: '13px', fontFamily: 'Sora, sans-serif', lineHeight: '1.6', margin: 0 }}>
              {result.enhancedPrompt}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Video Prompt Generator Tab ───────────────────────────────────────────────
function VideoPromptGenerator() {
  const [subject, setSubject] = useState('');
  const [mood, setMood] = useState('warm');
  const [platform, setPlatform] = useState('youtube');
  const [shotStyle, setShotStyle] = useState('cinematic');
  const [duration, setDuration] = useState('8');
  const [extraDetails, setExtraDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!subject.trim()) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const data = await apiFetch('/video-prompt', { subject, mood, platform, shotStyle, duration: `${duration} seconds`, extraDetails });
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const moodOptions = [
    { value: 'warm', label: '🌅 Warm & Golden' },
    { value: 'dark', label: '🌑 Dark & Moody' },
    { value: 'bright', label: '☀️ Bright & Airy' },
    { value: 'dramatic', label: '⚡ Dramatic' },
    { value: 'minimal', label: '⬜ Minimal & Clean' },
    { value: 'energetic', label: '🔥 High Energy' }
  ];

  const platformOptions = [
    { value: 'youtube', label: '▶️ YouTube (16:9)' },
    { value: 'reels', label: '📱 Instagram Reels (9:16)' },
    { value: 'tiktok', label: '🎵 TikTok (9:16)' },
    { value: 'shorts', label: '⚡ YouTube Shorts (9:16)' },
    { value: 'general', label: '🌐 General Purpose' }
  ];

  const shotOptions = [
    { value: 'cinematic', label: '🎬 Cinematic Dolly' },
    { value: 'closeup', label: '🔍 Close-Up' },
    { value: 'medium', label: '👤 Medium Shot' },
    { value: 'wide', label: '🌄 Wide / Establishing' },
    { value: 'overhead', label: '⬇️ Overhead / Top-Down' }
  ];

  const durationOptions = [
    { value: '6', label: '6 seconds' },
    { value: '8', label: '8 seconds' },
    { value: '10', label: '10 seconds' }
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '24px' }}>
      {/* Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <TextInput
          label="Subject / Scene"
          value={subject}
          onChange={setSubject}
          placeholder="Person typing on a mechanical keyboard, steam coffee mug..."
          multiline
          rows={3}
        />
        <Select label="Mood & Atmosphere" value={mood} onChange={setMood} options={moodOptions} />
        <Select label="Target Platform" value={platform} onChange={setPlatform} options={platformOptions} />
        <Select label="Shot Style" value={shotStyle} onChange={setShotStyle} options={shotOptions} />
        <Select label="Duration" value={duration} onChange={setDuration} options={durationOptions} />
        <TextInput
          label="Extra Details (optional)"
          value={extraDetails}
          onChange={setExtraDetails}
          placeholder="Add specific props, colors, time of day..."
          multiline
          rows={2}
        />
        <GenerateButton onClick={handleGenerate} loading={loading} label="Generate Video Prompt" icon="🎬" />

        {error && (
          <div style={{ background: '#2A0A0A', border: '1px solid #C42A18', borderRadius: '8px', padding: '12px', color: '#F87060', fontSize: '13px', fontFamily: 'DM Mono, monospace' }}>
            {error}
          </div>
        )}
      </div>

      {/* Output */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {result ? (
          <>
            {/* Main Prompt */}
            <div style={{ background: '#120F0B', border: '1px solid #8C6A2A', borderRadius: '12px', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px' }}>🎬</span>
                  <span style={{ fontSize: '13px', color: '#FCD97A', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>LTX-2 Video Prompt</span>
                </div>
                <CopyButton text={result.prompt} label="Copy Prompt" />
              </div>
              <p style={{ color: '#F0EBE0', fontSize: '14px', fontFamily: 'Sora, sans-serif', lineHeight: '1.7', margin: 0 }}>
                {result.prompt}
              </p>
            </div>

            {/* Negative Prompt */}
            <div style={{ background: '#0F0D0A', border: '1px solid #3D3428', borderRadius: '12px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '12px', color: '#6B5E4E', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase' }}>Negative Prompt</span>
                <CopyButton text={result.negativePrompt} label="Copy" />
              </div>
              <p style={{ color: '#6B5E4E', fontSize: '13px', fontFamily: 'DM Mono, monospace', lineHeight: '1.6', margin: 0 }}>
                {result.negativePrompt}
              </p>
            </div>

            {/* Open in LTX CTA */}
            <a
              href={result.metadata.ltxPlaygroundUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: 'none' }}
            >
              <div style={{
                background: 'linear-gradient(135deg, #1A1610, #120F0B)',
                border: '1px solid #8C6A2A', borderRadius: '12px', padding: '16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                cursor: 'pointer', transition: 'border-color 0.2s'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '24px' }}>🚀</span>
                  <div>
                    <div style={{ fontSize: '14px', color: '#F0EBE0', fontFamily: 'Sora, sans-serif', fontWeight: '600' }}>Open LTX-2 Playground</div>
                    <div style={{ fontSize: '12px', color: '#D4953A', fontFamily: 'DM Mono, monospace' }}>Paste your prompt → generate video free</div>
                  </div>
                </div>
                <span style={{ color: '#D4953A', fontSize: '18px' }}>→</span>
              </div>
            </a>

            {/* Workflow steps */}
            <div style={{ background: '#0F0D0A', border: '1px solid #3D3428', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '12px', color: '#A89880', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', marginBottom: '12px' }}>How to use this prompt</div>
              {[
                { step: '1', text: 'Copy the LTX-2 prompt above' },
                { step: '2', text: 'Click "Open LTX-2 Playground" button' },
                { step: '3', text: 'Paste prompt into the text field' },
                { step: '4', text: 'Paste negative prompt into negative field' },
                { step: '5', text: 'Click Generate — free, no account needed' }
              ].map(({ step, text }) => (
                <div key={step} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#1A1610', border: '1px solid #8C6A2A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#FCD97A', fontFamily: 'DM Mono, monospace', flexShrink: 0 }}>
                    {step}
                  </div>
                  <span style={{ fontSize: '13px', color: '#A89880', fontFamily: 'Sora, sans-serif' }}>{text}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{
            background: '#0F0D0A', border: '1px solid #3D3428', borderRadius: '12px',
            minHeight: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px'
          }}>
            {loading ? (
              <>
                <div style={{ width: '48px', height: '48px', border: '3px solid #F0A800', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <div style={{ color: '#FCD97A', fontSize: '14px', fontFamily: 'Sora, sans-serif' }}>Writing your cinematic prompt...</div>
              </>
            ) : (
              <>
                <span style={{ fontSize: '48px' }}>🎬</span>
                <div style={{ color: '#5C4E38', fontSize: '14px', fontFamily: 'Sora, sans-serif' }}>Your LTX-2 video prompt will appear here</div>
                <div style={{ color: '#3D3428', fontSize: '12px', fontFamily: 'DM Mono, monospace' }}>Fill in the fields and click Generate</div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Smart Prompt Builder Tab ─────────────────────────────────────────────────
function SmartPromptBuilder() {
  const [topic, setTopic] = useState('');
  const [niche, setNiche] = useState('');
  const [emotion, setEmotion] = useState('inspired');
  const [contentType, setContentType] = useState('educational');
  const [platform, setPlatform] = useState('Instagram / YouTube');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleBuild = async () => {
    if (!topic.trim()) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const data = await apiFetch('/build-prompt', {
        contentTopic: topic,
        niche,
        targetEmotion: emotion,
        contentType,
        platform
      });
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const emotionOptions = [
    { value: 'inspired', label: '✨ Inspired & Motivated' },
    { value: 'curious', label: '🤔 Curious & Intrigued' },
    { value: 'confident', label: '💪 Confident & Strong' },
    { value: 'peaceful', label: '🕊️ Calm & Peaceful' },
    { value: 'excited', label: '🔥 Excited & Energized' },
    { value: 'nostalgic', label: '🌅 Nostalgic & Reflective' }
  ];

  const contentTypeOptions = [
    { value: 'educational', label: '📚 Educational / How-To' },
    { value: 'motivational', label: '💡 Motivational / Inspirational' },
    { value: 'storytelling', label: '📖 Storytelling / Personal' },
    { value: 'product', label: '🛍️ Product / Offer' },
    { value: 'lifestyle', label: '🌿 Lifestyle / Aesthetic' }
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '24px' }}>
      {/* Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ padding: '12px', background: '#0F1A14', border: '1px solid #1E5050', borderRadius: '8px' }}>
          <div style={{ fontSize: '12px', color: '#6ECFBF', fontFamily: 'DM Mono, monospace', marginBottom: '4px' }}>✦ Smart Builder</div>
          <div style={{ fontSize: '13px', color: '#6B5E4E', fontFamily: 'Sora, sans-serif', lineHeight: '1.5' }}>
            Enter your content brief — Claude generates both image AND video prompts optimized for your niche.
          </div>
        </div>
        <TextInput label="Content Topic" value={topic} onChange={setTopic} placeholder="Morning routine for high performers..." multiline rows={3} />
        <TextInput label="Your Niche" value={niche} onChange={setNiche} placeholder="Fitness, Business, Faith, Lifestyle..." />
        <Select label="Target Emotion" value={emotion} onChange={setEmotion} options={emotionOptions} />
        <Select label="Content Type" value={contentType} onChange={setContentType} options={contentTypeOptions} />
        <TextInput label="Platform" value={platform} onChange={setPlatform} placeholder="Instagram / YouTube / TikTok" />
        <GenerateButton onClick={handleBuild} loading={loading} label="Build Prompts" icon="✦" />
        {error && (
          <div style={{ background: '#2A0A0A', border: '1px solid #C42A18', borderRadius: '8px', padding: '12px', color: '#F87060', fontSize: '13px', fontFamily: 'DM Mono, monospace' }}>
            {error}
          </div>
        )}
      </div>

      {/* Output */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {result ? (
          <>
            {/* Visual Direction */}
            <div style={{ background: '#0F1A14', border: '1px solid #1E5050', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '12px', color: '#6ECFBF', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', marginBottom: '10px' }}>✦ Visual Direction</div>
              <p style={{ color: '#C8F0E8', fontSize: '14px', fontFamily: 'Sora, sans-serif', lineHeight: '1.6', margin: 0 }}>{result.visualDirection}</p>
              {result.colorPalette && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#6B5E4E', fontFamily: 'DM Mono, monospace' }}>Palette:</span>
                  {result.colorPalette.map((c, i) => (
                    <div key={i} style={{ background: '#0F2E2E', border: '1px solid #1E5050', borderRadius: '4px', padding: '4px 10px', fontSize: '12px', color: '#6ECFBF', fontFamily: 'DM Mono, monospace' }}>{c}</div>
                  ))}
                </div>
              )}
            </div>

            {/* Image Prompt */}
            <div style={{ background: '#120F0B', border: '1px solid #3D3428', borderRadius: '12px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '13px', color: '#FCD97A', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase' }}>🎨 Image Prompt</span>
                <CopyButton text={result.imagePrompt} label="Copy" />
              </div>
              <p style={{ color: '#F0EBE0', fontSize: '14px', fontFamily: 'Sora, sans-serif', lineHeight: '1.6', margin: 0 }}>{result.imagePrompt}</p>
            </div>

            {/* Video Prompt */}
            <div style={{ background: '#120F0B', border: '1px solid #8C6A2A', borderRadius: '12px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '13px', color: '#FCD97A', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase' }}>🎬 Video Prompt (LTX-2)</span>
                <CopyButton text={result.videoPrompt} label="Copy" />
              </div>
              <p style={{ color: '#F0EBE0', fontSize: '14px', fontFamily: 'Sora, sans-serif', lineHeight: '1.6', margin: 0 }}>{result.videoPrompt}</p>
            </div>

            {/* Shot Recommendations */}
            {result.shotRecommendations && (
              <div style={{ background: '#0F0D0A', border: '1px solid #3D3428', borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '12px', color: '#A89880', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', marginBottom: '10px' }}>Director's Notes</div>
                {result.shotRecommendations.map((rec, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                    <span style={{ color: '#D4953A', fontSize: '14px' }}>✦</span>
                    <span style={{ color: '#A89880', fontSize: '13px', fontFamily: 'Sora, sans-serif', lineHeight: '1.5' }}>{rec}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div style={{
            background: '#0F0D0A', border: '1px solid #3D3428', borderRadius: '12px',
            minHeight: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px'
          }}>
            {loading ? (
              <>
                <div style={{ width: '48px', height: '48px', border: '3px solid #F0A800', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <div style={{ color: '#FCD97A', fontSize: '14px', fontFamily: 'Sora, sans-serif' }}>Building your visual strategy...</div>
              </>
            ) : (
              <>
                <span style={{ fontSize: '48px' }}>✦</span>
                <div style={{ color: '#5C4E38', fontSize: '14px', fontFamily: 'Sora, sans-serif' }}>Enter your content brief to get started</div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Storyboard Generator Tab ─────────────────────────────────────────────────
function StoryboardGenerator() {
  const [mode, setMode] = useState('quick');
  const [input, setInput] = useState('');
  const [platform, setPlatform] = useState('youtube');
  const [style, setStyle] = useState('cinematic');
  const [niche, setNiche] = useState('');
  const [loading, setLoading] = useState(false);
  const [storyboard, setStoryboard] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [error, setError] = useState('');
  const [activeScene, setActiveScene] = useState(0);
  const [regeneratingScene, setRegeneratingScene] = useState(null);
  const [exportView, setExportView] = useState(false);

  const handleGenerate = async () => {
    if (!input.trim()) return;
    setLoading(true); setError(''); setStoryboard(null); setActiveScene(0);
    try {
      const data = await apiFetch('/storyboard', { input, mode, platform, style, niche });
      setStoryboard(data.storyboard);
      setMetadata(data.metadata);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateScene = async (scene, index) => {
    setRegeneratingScene(index);
    try {
      const data = await apiFetch('/storyboard/regenerate-scene', { scene, platform, style });
      const updatedScenes = [...storyboard.scenes];
      updatedScenes[index] = data.updatedScene;
      setStoryboard({ ...storyboard, scenes: updatedScenes });
    } catch (e) {
      setError(e.message);
    } finally {
      setRegeneratingScene(null);
    }
  };

  const platformOptions = [
    { value: 'youtube', label: '▶️ YouTube (16:9)' },
    { value: 'reels', label: '📱 Reels (9:16)' },
    { value: 'tiktok', label: '🎵 TikTok (9:16)' },
    { value: 'shorts', label: '⚡ Shorts (9:16)' },
    { value: 'general', label: '🌐 General' }
  ];

  const styleOptions = [
    { value: 'cinematic', label: '🎬 Cinematic' },
    { value: 'documentary', label: '🎥 Documentary' },
    { value: 'minimal', label: '⬜ Minimal & Clean' },
    { value: 'dark', label: '🌑 Dark & Moody' },
    { value: 'vibrant', label: '🌈 Vibrant & Bold' },
    { value: 'lifestyle', label: '🌿 Lifestyle' }
  ];

  const shotIcons = {
    closeup: '🔍', medium: '👤', wide: '🌄', overhead: '⬇️',
    pov: '👁️', cutaway: '✂️', cinematic: '🎬'
  };

  if (storyboard) {
    return (
      <div style={{ animation: 'fadeIn 0.3s ease' }}>
        {/* Storyboard Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span style={{ fontSize: '20px' }}>🎞️</span>
              <h2 style={{ margin: 0, fontSize: '20px', color: '#fff', fontWeight: '700' }}>{storyboard.title}</h2>
            </div>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', color: '#D4953A', fontFamily: 'DM Mono, monospace' }}>
                {metadata?.sceneCount} scenes
              </span>
              <span style={{ fontSize: '12px', color: '#6B5E4E', fontFamily: 'DM Mono, monospace' }}>
                {storyboard.totalDuration}
              </span>
              <span style={{ fontSize: '12px', color: '#6B5E4E', fontFamily: 'DM Mono, monospace' }}>
                {storyboard.colorGrade}
              </span>
            </div>
            <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#A89880', fontFamily: 'Sora, sans-serif', maxWidth: '600px' }}>
              {storyboard.visualTheme}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
            <button
              onClick={() => setExportView(!exportView)}
              style={{ background: '#1A1610', border: '1px solid #3D3428', borderRadius: '8px', color: '#A89880', padding: '8px 14px', fontSize: '13px', cursor: 'pointer', fontFamily: 'DM Mono, monospace' }}
            >
              {exportView ? '⊞ Grid View' : '📋 Export View'}
            </button>
            <button
              onClick={() => { setStoryboard(null); setMetadata(null); }}
              style={{ background: '#1A1610', border: '1px solid #3D3428', borderRadius: '8px', color: '#A89880', padding: '8px 14px', fontSize: '13px', cursor: 'pointer', fontFamily: 'DM Mono, monospace' }}
            >
              ← New Storyboard
            </button>
          </div>
        </div>

        {exportView ? (
          /* ── Export / Print View ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {storyboard.scenes.map((scene, i) => (
              <div key={i} style={{ background: '#0F0D0A', border: '1px solid #3D3428', borderRadius: '12px', padding: '20px', display: 'grid', gridTemplateColumns: '200px 1fr', gap: '20px' }}>
                <img src={scene.imageUrl} alt={scene.title} style={{ width: '100%', aspectRatio: metadata?.aspect === '9:16' ? '9/16' : '16/9', objectFit: 'cover', borderRadius: '8px' }} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#F0A800', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#fff', fontFamily: 'DM Mono, monospace', flexShrink: 0 }}>
                      {scene.sceneNumber}
                    </div>
                    <h3 style={{ margin: 0, fontSize: '15px', color: '#fff', fontWeight: '600' }}>{scene.title}</h3>
                    <span style={{ fontSize: '12px', color: '#6B5E4E', fontFamily: 'DM Mono, monospace' }}>{scene.duration}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    {[
                      { label: 'Shot', value: `${shotIcons[scene.shotType] || '🎬'} ${scene.shotType}` },
                      { label: 'Camera', value: scene.cameraMove },
                      { label: 'Mood', value: scene.mood },
                      { label: 'Lighting', value: scene.lightingNotes }
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <div style={{ fontSize: '11px', color: '#5C4E38', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', marginBottom: '2px' }}>{label}</div>
                        <div style={{ fontSize: '13px', color: '#A89880', fontFamily: 'Sora, sans-serif' }}>{value}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: '#1A1610', borderRadius: '6px', padding: '10px', marginBottom: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#5C4E38', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', marginBottom: '4px' }}>Visual</div>
                    <p style={{ margin: 0, fontSize: '13px', color: '#E8E0D4', fontFamily: 'Sora, sans-serif', lineHeight: '1.5' }}>{scene.visualDescription}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <CopyButton text={scene.videoPrompt} label="Copy Video Prompt" />
                    <CopyButton text={scene.imagePrompt} label="Copy Image Prompt" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ── Grid / Interactive View ── */
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px' }}>
            {/* Scene filmstrip */}
            <div>
              {/* Filmstrip thumbnails */}
              <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '20px' }}>
                {storyboard.scenes.map((scene, i) => (
                  <div
                    key={i}
                    onClick={() => setActiveScene(i)}
                    style={{
                      flexShrink: 0, width: '120px', cursor: 'pointer',
                      border: activeScene === i ? '2px solid #F0A800' : '2px solid transparent',
                      borderRadius: '8px', overflow: 'hidden', position: 'relative',
                      transition: 'border-color 0.2s'
                    }}
                  >
                    <img
                      src={scene.imageUrl}
                      alt={scene.title}
                      style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }}
                    />
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0,
                      background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
                      padding: '12px 6px 6px'
                    }}>
                      <div style={{ fontSize: '10px', color: '#fff', fontFamily: 'DM Mono, monospace', textAlign: 'center' }}>
                        {scene.sceneNumber}. {scene.title.slice(0, 12)}{scene.title.length > 12 ? '...' : ''}
                      </div>
                    </div>
                    {activeScene === i && (
                      <div style={{ position: 'absolute', top: '4px', right: '4px', width: '8px', height: '8px', borderRadius: '50%', background: '#D4953A' }} />
                    )}
                  </div>
                ))}
              </div>

              {/* Active scene large view */}
              {storyboard.scenes[activeScene] && (() => {
                const scene = storyboard.scenes[activeScene];
                return (
                  <div style={{ background: '#0F0D0A', border: '1px solid #3D3428', borderRadius: '14px', overflow: 'hidden' }}>
                    {/* Scene image */}
                    <div style={{ position: 'relative' }}>
                      {regeneratingScene === activeScene ? (
                        <div style={{ aspectRatio: '16/9', background: '#1A1610', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                          <div style={{ width: '40px', height: '40px', border: '3px solid #F0A800', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                          <span style={{ color: '#FCD97A', fontSize: '13px', fontFamily: 'Sora, sans-serif' }}>Regenerating scene...</span>
                        </div>
                      ) : (
                        <img src={scene.imageUrl} alt={scene.title} style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }} />
                      )}
                      {/* Overlay badges */}
                      <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', gap: '8px' }}>
                        <div style={{ background: 'rgba(0,0,0,0.75)', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', color: '#fff', fontFamily: 'DM Mono, monospace' }}>
                          Scene {scene.sceneNumber}
                        </div>
                        <div style={{ background: 'rgba(212,149,58,0.85)', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', color: '#fff', fontFamily: 'DM Mono, monospace' }}>
                          {shotIcons[scene.shotType] || '🎬'} {scene.shotType}
                        </div>
                        <div style={{ background: 'rgba(0,0,0,0.75)', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', color: '#fff', fontFamily: 'DM Mono, monospace' }}>
                          {scene.duration}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRegenerateScene(scene, activeScene)}
                        disabled={regeneratingScene !== null}
                        style={{
                          position: 'absolute', top: '12px', right: '12px',
                          background: 'rgba(0,0,0,0.75)', border: '1px solid #5C4E38',
                          borderRadius: '6px', color: '#F0EBE0', padding: '6px 12px',
                          fontSize: '12px', cursor: 'pointer', fontFamily: 'DM Mono, monospace',
                          display: 'flex', alignItems: 'center', gap: '6px'
                        }}
                      >
                        ↺ Regenerate
                      </button>
                    </div>

                    {/* Scene details */}
                    <div style={{ padding: '20px' }}>
                      <h3 style={{ margin: '0 0 6px', fontSize: '17px', color: '#fff', fontWeight: '600' }}>{scene.title}</h3>
                      <p style={{ margin: '0 0 16px', fontSize: '14px', color: '#A89880', fontFamily: 'Sora, sans-serif', lineHeight: '1.6' }}>
                        {scene.visualDescription}
                      </p>

                      {/* Scene meta grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
                        {[
                          { label: 'Camera', value: scene.cameraMove, icon: '📷' },
                          { label: 'Mood', value: scene.mood, icon: '🎭' },
                          { label: 'Lighting', value: scene.lightingNotes, icon: '💡' }
                        ].map(({ label, value, icon }) => (
                          <div key={label} style={{ background: '#1A1610', borderRadius: '8px', padding: '10px' }}>
                            <div style={{ fontSize: '11px', color: '#5C4E38', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', marginBottom: '4px' }}>{icon} {label}</div>
                            <div style={{ fontSize: '12px', color: '#E8E0D4', fontFamily: 'Sora, sans-serif' }}>{value}</div>
                          </div>
                        ))}
                      </div>

                      {/* Script note */}
                      {scene.scriptNote && (
                        <div style={{ background: '#0F1A14', border: '1px solid #1E5050', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
                          <div style={{ fontSize: '11px', color: '#6ECFBF', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', marginBottom: '6px' }}>📝 Content Note</div>
                          <p style={{ margin: 0, fontSize: '13px', color: '#C8F0E8', fontFamily: 'Sora, sans-serif', lineHeight: '1.5' }}>{scene.scriptNote}</p>
                        </div>
                      )}

                      {/* Prompt actions */}
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <CopyButton text={scene.videoPrompt} label="📋 Copy Video Prompt" />
                        <CopyButton text={scene.imagePrompt} label="🎨 Copy Image Prompt" />
                        <a href="https://app.ltx.studio/ltx-2-playground/t2v" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                          <button style={{ background: '#1A1610', border: '1px solid #8C6A2A', borderRadius: '6px', color: '#FCD97A', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', fontFamily: 'DM Mono, monospace' }}>
                            🎬 Generate in LTX →
                          </button>
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Right panel — scene list + video prompts */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '12px', color: '#6B5E4E', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
                All Scenes
              </div>
              {storyboard.scenes.map((scene, i) => (
                <div
                  key={i}
                  onClick={() => setActiveScene(i)}
                  style={{
                    background: activeScene === i ? '#1A1610' : '#0F0D0A',
                    border: `1px solid ${activeScene === i ? '#F0A800' : '#3D3428'}`,
                    borderRadius: '10px', padding: '12px 14px', cursor: 'pointer',
                    transition: 'all 0.15s', display: 'flex', gap: '12px', alignItems: 'flex-start'
                  }}
                >
                  {/* Thumbnail */}
                  <img
                    src={scene.imageUrl}
                    alt={scene.title}
                    style={{ width: '60px', height: '34px', objectFit: 'cover', borderRadius: '4px', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                      <span style={{ fontSize: '11px', color: '#D4953A', fontFamily: 'DM Mono, monospace' }}>{scene.sceneNumber}</span>
                      <span style={{ fontSize: '13px', color: '#F0EBE0', fontFamily: 'Sora, sans-serif', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{scene.title}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <span style={{ fontSize: '11px', color: '#5C4E38', fontFamily: 'DM Mono, monospace' }}>{shotIcons[scene.shotType]} {scene.shotType}</span>
                      <span style={{ fontSize: '11px', color: '#5C4E38', fontFamily: 'DM Mono, monospace' }}>· {scene.duration}</span>
                    </div>
                  </div>
                  {regeneratingScene === i && (
                    <div style={{ width: '16px', height: '16px', border: '2px solid #F0A800', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', flexShrink: 0 }} />
                  )}
                </div>
              ))}

              {/* Copy all video prompts */}
              <div style={{ marginTop: '8px' }}>
                <CopyButton
                  text={storyboard.scenes.map((s, i) => `SCENE ${s.sceneNumber}: ${s.title}\n${s.videoPrompt}`).join('\n\n---\n\n')}
                  label="📋 Copy All Video Prompts"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Input form
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '24px' }}>
      {/* Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Mode toggle */}
        <div>
          <div style={{ fontSize: '12px', color: '#A89880', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Mode</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {[
              { id: 'quick', icon: '⚡', label: 'Quick', sub: 'Topic or hook' },
              { id: 'script', icon: '📝', label: 'Script', sub: 'Full script text' }
            ].map(m => (
              <div
                key={m.id}
                onClick={() => setMode(m.id)}
                style={{
                  background: mode === m.id ? '#1A1610' : '#1A1610',
                  border: `1px solid ${mode === m.id ? '#D4953A' : '#3D3428'}`,
                  borderRadius: '8px', padding: '12px', cursor: 'pointer', transition: 'all 0.15s'
                }}
              >
                <div style={{ fontSize: '18px', marginBottom: '4px' }}>{m.icon}</div>
                <div style={{ fontSize: '13px', color: mode === m.id ? '#F0EBE0' : '#A89880', fontFamily: 'Sora, sans-serif', fontWeight: '500' }}>{m.label}</div>
                <div style={{ fontSize: '11px', color: '#5C4E38', fontFamily: 'DM Mono, monospace' }}>{m.sub}</div>
              </div>
            ))}
          </div>
        </div>

        <TextInput
          label={mode === 'script' ? 'Paste Your Script' : 'Video Topic or Hook'}
          value={input}
          onChange={setInput}
          placeholder={mode === 'script'
            ? 'Paste your full video script here...'
            : 'e.g. "5 morning habits that changed my life" or "How I went from $0 to $10k/month..."'
          }
          multiline
          rows={mode === 'script' ? 8 : 4}
        />

        <Select label="Platform" value={platform} onChange={setPlatform} options={platformOptions} />
        <Select label="Visual Style" value={style} onChange={setStyle} options={styleOptions} />
        <TextInput label="Niche (optional)" value={niche} onChange={setNiche} placeholder="Fitness, Faith, Business, Lifestyle..." />

        <GenerateButton onClick={handleGenerate} loading={loading} label="Generate Storyboard" icon="🎞️" />

        {error && (
          <div style={{ background: '#2A0A0A', border: '1px solid #C42A18', borderRadius: '8px', padding: '12px', color: '#F87060', fontSize: '13px', fontFamily: 'DM Mono, monospace' }}>
            {error}
          </div>
        )}
      </div>

      {/* Preview / explainer */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {loading ? (
          <div style={{ background: '#0F0D0A', border: '1px solid #3D3428', borderRadius: '14px', minHeight: '500px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
            <div style={{ width: '56px', height: '56px', border: '3px solid #F0A800', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#FCD97A', fontSize: '16px', fontFamily: 'Sora, sans-serif', fontWeight: '600', marginBottom: '6px' }}>Building your storyboard...</div>
              <div style={{ color: '#6B5E4E', fontSize: '13px', fontFamily: 'DM Mono, monospace' }}>Claude is breaking your content into scenes</div>
              <div style={{ color: '#5C4E38', fontSize: '12px', fontFamily: 'DM Mono, monospace', marginTop: '4px' }}>Generating reference images for each scene</div>
            </div>
          </div>
        ) : (
          <div style={{ background: '#0F0D0A', border: '1px solid #3D3428', borderRadius: '14px', padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎞️</div>
              <div style={{ fontSize: '18px', color: '#fff', fontFamily: 'Sora, sans-serif', fontWeight: '600', marginBottom: '8px' }}>AI-Guided Storyboard</div>
              <div style={{ fontSize: '14px', color: '#6B5E4E', fontFamily: 'Sora, sans-serif', lineHeight: '1.6', maxWidth: '400px', margin: '0 auto' }}>
                Turn any topic or script into a complete visual production plan with AI-generated reference images for every scene.
              </div>
            </div>

            {/* Feature list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { icon: '🎬', title: 'Scene Breakdown', desc: '4-8 scenes with shot types, camera moves & lighting' },
                { icon: '🖼️', title: 'Reference Images', desc: 'AI-generated visual for every scene automatically' },
                { icon: '📋', title: 'Video Prompts', desc: 'LTX-2 ready prompts for every scene\'s B-roll' },
                { icon: '↺', title: 'Regenerate Scenes', desc: 'Don\'t like a scene? Regenerate it instantly' },
                { icon: '📤', title: 'Export View', desc: 'Clean export layout for client briefs or pre-production' }
              ].map(({ icon, title, desc }) => (
                <div key={title} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '10px', background: '#1A1610', borderRadius: '8px' }}>
                  <span style={{ fontSize: '18px', flexShrink: 0 }}>{icon}</span>
                  <div>
                    <div style={{ fontSize: '13px', color: '#F0EBE0', fontFamily: 'Sora, sans-serif', fontWeight: '500' }}>{title}</div>
                    <div style={{ fontSize: '12px', color: '#6B5E4E', fontFamily: 'DM Mono, monospace' }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main AI Studio Component ─────────────────────────────────────────────────
export default function AIStudio() {
  const [activeTab, setActiveTab] = useState('image');

  const tabs = [
    { id: 'image', icon: '🎨', label: 'Image Generator' },
    { id: 'video', icon: '🎬', label: 'Video Prompt' },
    { id: 'smart', icon: '✦', label: 'Smart Builder' },
    { id: 'storyboard', icon: '🎞️', label: 'Storyboard' }
  ];

  return (
    <div style={{
      minHeight: '100vh', background: '#0F0D0A', color: '#F0EBE0',
      fontFamily: 'Sora, sans-serif', padding: '32px'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300;1,400&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0F0D0A; }
        ::-webkit-scrollbar-thumb { background: #3D3428; border-radius: 3px; }
        select option { background: #1A1610; color: #F0EBE0; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: '32px', animation: 'fadeIn 0.4s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #D4953A, #F0A800)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px',
            boxShadow: '0 0 24px rgba(212,149,58,0.3)'
          }}>
            ✦
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#fff', letterSpacing: '-0.02em' }}>
              AI Studio
            </h1>
            <p style={{ margin: 0, fontSize: '13px', color: '#6B5E4E', fontFamily: 'DM Mono, monospace' }}>
              Generate images & video prompts for your content
            </p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ padding: '4px 12px', background: '#0F1A14', border: '1px solid #1E5050', borderRadius: '20px', fontSize: '12px', color: '#6ECFBF', fontFamily: 'DM Mono, monospace' }}>
              🆓 Free Tier Active
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: '16px', marginTop: '20px' }}>
          {[
            { label: 'Image Engine', value: 'Pollinations AI', sub: 'Free • Unlimited' },
            { label: 'Video Prompts', value: 'LTX-2 Ready', sub: 'Claude-optimized' },
            { label: 'Storyboard', value: 'AI Director', sub: 'Script → scenes → visuals' },
            { label: 'AI Layer', value: 'Claude Opus', sub: 'Prompt enhancement' }
          ].map(({ label, value, sub }) => (
            <div key={label} style={{ flex: 1, background: '#1A1610', borderRadius: '10px', padding: '12px 16px', border: '1px solid #3D3428' }}>
              <div style={{ fontSize: '11px', color: '#6B5E4E', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
              <div style={{ fontSize: '15px', color: '#F0EBE0', fontWeight: '600', marginTop: '4px' }}>{value}</div>
              <div style={{ fontSize: '11px', color: '#D4953A', fontFamily: 'DM Mono, monospace', marginTop: '2px' }}>{sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex', gap: '4px', background: '#1A1610', borderRadius: '10px',
        padding: '4px', width: 'fit-content', marginBottom: '28px',
        border: '1px solid #3D3428'
      }}>
        {tabs.map(tab => (
          <TabButton
            key={tab.id}
            active={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            icon={tab.icon}
            label={tab.label}
          />
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ animation: 'fadeIn 0.3s ease' }}>
        {activeTab === 'image' && <ImageGenerator />}
        {activeTab === 'video' && <VideoPromptGenerator />}
        {activeTab === 'smart' && <SmartPromptBuilder />}
        {activeTab === 'storyboard' && <StoryboardGenerator />}
      </div>
    </div>
  );
}