import { useState, useRef, useEffect } from 'react';

const API_BASE = '/api/ai-studio';

// ─── Shared fetch helpers ─────────────────────────────────────────────────────
async function apiPost(endpoint, body) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed (${res.status})`);
  }
  return res.json();
}

async function apiGet(endpoint) {
  const res = await fetch(`${API_BASE}${endpoint}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed (${res.status})`);
  }
  return res.json();
}

// ─── usePoll hook ─────────────────────────────────────────────────────────────
// Polls GET endpoint every intervalMs while isActive.
// Calls onComplete({ data, succeeded }) when status is completed or failed.
function usePoll({ endpoint, isActive, intervalMs = 4000, onComplete }) {
  const timerRef = useRef(null);

  useEffect(() => {
    if (!isActive || !endpoint) return;

    const poll = async () => {
      try {
        const data = await apiGet(endpoint);
        const status = (data.status || '').toLowerCase();
        if (status === 'completed' || status === 'failed' || status === 'error') {
          onComplete({ data, succeeded: status === 'completed' });
          return;
        }
        timerRef.current = setTimeout(poll, intervalMs);
      } catch (err) {
        onComplete({ data: { error: err.message }, succeeded: false });
      }
    };

    timerRef.current = setTimeout(poll, intervalMs);
    return () => clearTimeout(timerRef.current);
  }, [isActive, endpoint, intervalMs]);
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: '#0C0A07',
  surface: '#141008',
  card: '#1A1610',
  border: '#2E2818',
  borderHover: '#4A3E2A',
  amber: '#F0A800',
  amberDim: '#B37D00',
  text: '#F0EBE0',
  textMid: '#C8BAA0',
  textDim: '#8A7B64',
  green: '#4ADE80',
  red: '#F87171',
  blue: '#60A5FA'
};

const font = { sora: 'Sora, sans-serif', mono: 'DM Mono, monospace' };

// ─── Shared UI components ─────────────────────────────────────────────────────
function TabButton({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '10px 22px', borderRadius: '8px', border: 'none',
        cursor: 'pointer', fontSize: '14px', fontFamily: font.sora,
        fontWeight: active ? '600' : '400',
        background: active ? C.amber : 'transparent',
        color: active ? '#0C0A07' : C.textDim,
        transition: 'all 0.2s',
        whiteSpace: 'nowrap'
      }}
    >
      <span style={{ fontSize: '16px' }}>{icon}</span>
      {label}
    </button>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{
        fontSize: '11px', color: C.textDim, fontFamily: font.mono,
        textTransform: 'uppercase', letterSpacing: '0.1em'
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        background: C.card, border: `1px solid ${C.border}`, borderRadius: '8px',
        color: C.text, padding: '10px 14px', fontSize: '14px',
        fontFamily: font.sora, outline: 'none', width: '100%',
        boxSizing: 'border-box', transition: 'border-color 0.2s'
      }}
      onFocus={e => (e.target.style.borderColor = C.amber)}
      onBlur={e => (e.target.style.borderColor = C.border)}
    />
  );
}

function Textarea({ value, onChange, placeholder, rows = 4 }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{
        background: C.card, border: `1px solid ${C.border}`, borderRadius: '8px',
        color: C.text, padding: '10px 14px', fontSize: '14px',
        fontFamily: font.sora, outline: 'none', width: '100%',
        boxSizing: 'border-box', resize: 'vertical', transition: 'border-color 0.2s'
      }}
      onFocus={e => (e.target.style.borderColor = C.amber)}
      onBlur={e => (e.target.style.borderColor = C.border)}
    />
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <Field label={label}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: '8px',
          color: C.text, padding: '10px 14px', fontSize: '14px',
          fontFamily: font.sora, outline: 'none', appearance: 'none', cursor: 'pointer'
        }}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </Field>
  );
}

function Btn({ onClick, disabled, loading, children, variant = 'primary', style: extraStyle = {} }) {
  const base = {
    padding: '11px 22px', borderRadius: '8px', border: 'none',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    fontSize: '14px', fontFamily: font.sora, fontWeight: '600',
    display: 'inline-flex', alignItems: 'center', gap: '8px',
    transition: 'all 0.2s', opacity: disabled || loading ? 0.5 : 1,
    ...extraStyle
  };
  const variants = {
    primary: { background: C.amber, color: '#0C0A07' },
    secondary: { background: C.card, color: C.text, border: `1px solid ${C.border}` },
    ghost: { background: 'transparent', color: C.textMid, border: `1px solid ${C.border}` }
  };
  return (
    <button onClick={onClick} disabled={disabled || loading} style={{ ...base, ...variants[variant] }}>
      {loading && <Spinner size={14} color={variant === 'primary' ? '#0C0A07' : C.amber} />}
      {children}
    </button>
  );
}

function Spinner({ size = 20, color = C.amber }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      style={{ animation: 'spin 0.8s linear infinite' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="3"
        strokeDasharray="31.4 31.4" strokeLinecap="round" />
    </svg>
  );
}

function Tag({ children, color = C.amber }) {
  return (
    <span style={{
      fontSize: '11px', fontFamily: font.mono, padding: '2px 8px',
      borderRadius: '4px', background: color + '22', color, letterSpacing: '0.05em'
    }}>
      {children}
    </span>
  );
}

function Card({ children, style: s = {} }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: '12px', padding: '20px', ...s
    }}>
      {children}
    </div>
  );
}

function PromptBox({ label, text, color = C.amber }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Tag color={color}>{label}</Tag>
        <Btn variant="ghost" onClick={copy} style={{ padding: '4px 10px', fontSize: '12px' }}>
          {copied ? '✓ Copied' : 'Copy'}
        </Btn>
      </div>
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`, borderRadius: '8px',
        padding: '12px', fontFamily: font.mono, fontSize: '13px',
        color: C.textMid, lineHeight: '1.6', whiteSpace: 'pre-wrap'
      }}>
        {text}
      </div>
    </div>
  );
}

// ─── ImageGenerator ───────────────────────────────────────────────────────────
function ImageGenerator() {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('photorealistic');
  const [aspect, setAspect] = useState('16:9');
  const [enhance, setEnhance] = useState(false);
  const [loading, setLoading] = useState(false);
  const [variLoading, setVariLoading] = useState(false);
  const [error, setError] = useState('');

  const [taskId, setTaskId] = useState(null);
  const [polling, setPolling] = useState(false);
  const [imageResult, setImageResult] = useState(null);

  const [variTaskId, setVariTaskId] = useState(null);
  const [variPolling, setVariPolling] = useState(false);
  const [variResult, setVariResult] = useState(null);

  usePoll({
    endpoint: taskId ? `/image-status/${taskId}` : null,
    isActive: polling,
    intervalMs: 4000,
    onComplete: ({ data, succeeded }) => {
      setPolling(false);
      if (succeeded) setImageResult(data);
      else setError(data.error || 'Image generation failed');
    }
  });

  usePoll({
    endpoint: variTaskId ? `/image-status/${variTaskId}` : null,
    isActive: variPolling,
    intervalMs: 4000,
    onComplete: ({ data, succeeded }) => {
      setVariPolling(false);
      if (succeeded) setVariResult(data);
      else setError(data.error || 'Variations failed');
    }
  });

  const generate = async (variations = false) => {
    if (!prompt.trim()) return;
    setError('');
    if (variations) { setVariLoading(true); setVariResult(null); }
    else { setLoading(true); setImageResult(null); }

    try {
      const endpoint = variations ? '/generate-variations' : '/generate-image';
      const data = await apiPost(endpoint, { prompt, style, aspectRatio: aspect, enhance: !variations && enhance });
      if (variations) { setVariTaskId(data.taskId); setVariPolling(true); setVariLoading(false); }
      else { setTaskId(data.taskId); setPolling(true); setLoading(false); }
    } catch (err) {
      setError(err.message);
      variations ? setVariLoading(false) : setLoading(false);
    }
  };

  const images = imageResult?.images || (imageResult?.url ? [imageResult.url] : []);
  const variImages = variResult?.images || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Field label="Prompt">
            <Textarea value={prompt} onChange={setPrompt} placeholder="Describe the image you want to generate…" rows={3} />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Select label="Style" value={style} onChange={setStyle} options={[
              { value: 'photorealistic', label: 'Photorealistic' },
              { value: 'cinematic', label: 'Cinematic' },
              { value: 'artistic', label: 'Artistic' },
              { value: 'minimal', label: 'Minimal' },
              { value: 'dark', label: 'Dark Aesthetic' },
              { value: 'vibrant', label: 'Vibrant' }
            ]} />
            <Select label="Aspect Ratio" value={aspect} onChange={setAspect} options={[
              { value: '16:9', label: '16:9 — Landscape' },
              { value: '9:16', label: '9:16 — Vertical' },
              { value: '1:1', label: '1:1 — Square' },
              { value: '4:3', label: '4:3 — Classic' }
            ]} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              onClick={() => setEnhance(!enhance)}
              style={{
                width: '40px', height: '22px', borderRadius: '11px', cursor: 'pointer',
                background: enhance ? C.amber : C.border, position: 'relative', transition: 'background 0.2s'
              }}
            >
              <div style={{
                position: 'absolute', top: '3px', left: enhance ? '21px' : '3px',
                width: '16px', height: '16px', borderRadius: '50%',
                background: '#fff', transition: 'left 0.2s'
              }} />
            </div>
            <span style={{ fontSize: '13px', color: C.textMid, fontFamily: font.sora }}>AI Enhance prompt</span>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Btn onClick={() => generate(false)} loading={loading} disabled={!prompt.trim() || polling}>
              🍌 Generate Image
            </Btn>
            <Btn onClick={() => generate(true)} loading={variLoading} disabled={!prompt.trim() || variPolling} variant="secondary">
              Generate 4 Variations
            </Btn>
          </div>
          {error && (
            <div style={{ color: C.red, fontSize: '13px', fontFamily: font.mono }}>{error}</div>
          )}
        </div>
      </Card>

      {/* Single image result */}
      {(polling || images.length > 0) && (
        <Card>
          <div style={{ marginBottom: '12px', fontSize: '13px', color: C.textDim, fontFamily: font.mono }}>
            <Tag color={C.amber}>Nano Banana 2</Tag>
          </div>
          {polling ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '20px 0' }}>
              <Spinner /><span style={{ color: C.textMid, fontFamily: font.sora }}>Generating image…</span>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
              {images.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noreferrer">
                  <img src={url} alt={`Generated ${i + 1}`}
                    style={{ width: '100%', borderRadius: '8px', display: 'block', border: `1px solid ${C.border}` }} />
                </a>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Variations result */}
      {(variPolling || variImages.length > 0) && (
        <Card>
          <div style={{ marginBottom: '12px' }}><Tag>4 Variations — Nano Banana 2</Tag></div>
          {variPolling ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '20px 0' }}>
              <Spinner /><span style={{ color: C.textMid, fontFamily: font.sora }}>Generating variations…</span>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              {variImages.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noreferrer">
                  <img src={url} alt={`Variation ${i + 1}`}
                    style={{ width: '100%', borderRadius: '8px', display: 'block', border: `1px solid ${C.border}` }} />
                </a>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

// ─── VideoGenerator ───────────────────────────────────────────────────────────
function VideoGenerator() {
  const [mode, setMode] = useState('kling'); // 'kling' | 'blotato'

  // Kling state
  const [kSubject, setKSubject] = useState('');
  const [kMood, setKMood] = useState('cinematic');
  const [kPlatform, setKPlatform] = useState('youtube');
  const [kDuration, setKDuration] = useState('5');
  const [kExtra, setKExtra] = useState('');
  const [kLoading, setKLoading] = useState(false);
  const [kTaskId, setKTaskId] = useState(null);
  const [kPolling, setKPolling] = useState(false);
  const [kResult, setKResult] = useState(null);
  const [kPrompt, setKPrompt] = useState('');

  // Blotato state
  const [bTopic, setBTopic] = useState('');
  const [bNiche, setBNiche] = useState('');
  const [bPlatform, setBPlatform] = useState('tiktok');
  const [bStyle, setBStyle] = useState('engaging');
  const [bLoading, setBLoading] = useState(false);
  const [bJobId, setBJobId] = useState(null);
  const [bPolling, setBPolling] = useState(false);
  const [bResult, setBResult] = useState(null);
  const [bScript, setBScript] = useState('');

  const [error, setError] = useState('');

  usePoll({
    endpoint: kTaskId ? `/video-status/${kTaskId}` : null,
    isActive: kPolling,
    intervalMs: 8000,
    onComplete: ({ data, succeeded }) => {
      setKPolling(false);
      if (succeeded) setKResult(data);
      else setError(data.error || 'Video generation failed');
    }
  });

  usePoll({
    endpoint: bJobId ? `/faceless-status/${bJobId}` : null,
    isActive: bPolling,
    intervalMs: 8000,
    onComplete: ({ data, succeeded }) => {
      setBPolling(false);
      if (succeeded) setBResult(data);
      else setError(data.error || 'Faceless video failed');
    }
  });

  const submitKling = async () => {
    if (!kSubject.trim()) return;
    setError(''); setKLoading(true); setKResult(null); setKPrompt('');
    try {
      const data = await apiPost('/generate-video', {
        subject: kSubject, mood: kMood, platform: kPlatform,
        duration: kDuration, extraDetails: kExtra
      });
      setKTaskId(data.taskId);
      setKPrompt(data.prompt || '');
      setKPolling(true);
    } catch (err) { setError(err.message); }
    finally { setKLoading(false); }
  };

  const submitBlotato = async () => {
    if (!bTopic.trim()) return;
    setError(''); setBLoading(true); setBResult(null); setBScript('');
    try {
      const data = await apiPost('/generate-faceless-video', {
        topic: bTopic, niche: bNiche, platform: bPlatform, tone: bStyle
      });
      setBJobId(data.jobId);
      setBScript(data.script || '');
      setBPolling(true);
    } catch (err) { setError(err.message); }
    finally { setBLoading(false); }
  };

  const modeBtn = (m, label) => (
    <button onClick={() => setMode(m)} style={{
      padding: '8px 18px', borderRadius: '6px', border: 'none', cursor: 'pointer',
      fontFamily: font.sora, fontSize: '13px', fontWeight: mode === m ? '600' : '400',
      background: mode === m ? C.amber : C.card,
      color: mode === m ? '#0C0A07' : C.textDim
    }}>{label}</button>
  );

  const videoUrl = kResult?.video_url || kResult?.url;
  const bVideoUrl = bResult?.video_url || bResult?.url;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', gap: '4px', background: C.surface, padding: '4px', borderRadius: '10px', alignSelf: 'flex-start' }}>
        {modeBtn('kling', '🎬 Kling 2.1 B-Roll')}
        {modeBtn('blotato', '🤖 Blotato Faceless')}
      </div>

      {mode === 'kling' && (
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <Field label="Subject / Scene Description">
              <Input value={kSubject} onChange={setKSubject} placeholder="e.g. a lone entrepreneur working at midnight in a neon-lit office" />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <Select label="Mood" value={kMood} onChange={setKMood} options={[
                { value: 'cinematic', label: 'Cinematic' },
                { value: 'dark', label: 'Dark & Moody' },
                { value: 'bright', label: 'Bright & Clean' },
                { value: 'warm', label: 'Warm & Intimate' },
                { value: 'dramatic', label: 'Dramatic' },
                { value: 'energetic', label: 'Energetic' }
              ]} />
              <Select label="Platform" value={kPlatform} onChange={setKPlatform} options={[
                { value: 'youtube', label: 'YouTube 16:9' },
                { value: 'reels', label: 'Reels 9:16' },
                { value: 'tiktok', label: 'TikTok 9:16' },
                { value: 'shorts', label: 'Shorts 9:16' }
              ]} />
              <Select label="Duration" value={kDuration} onChange={setKDuration} options={[
                { value: '5', label: '5 seconds' },
                { value: '8', label: '8 seconds' },
                { value: '10', label: '10 seconds' }
              ]} />
            </div>
            <Field label="Extra Direction (optional)">
              <Input value={kExtra} onChange={setKExtra} placeholder="slow motion, rain, golden hour…" />
            </Field>
            <Btn onClick={submitKling} loading={kLoading} disabled={!kSubject.trim() || kPolling}>
              🎬 Generate Kling 2.1 Video
            </Btn>
            {error && <div style={{ color: C.red, fontSize: '13px', fontFamily: font.mono }}>{error}</div>}
          </div>
        </Card>
      )}

      {mode === 'blotato' && (
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <Field label="Video Topic">
              <Input value={bTopic} onChange={setBTopic} placeholder="e.g. 5 habits that changed my life" />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <Select label="Niche" value={bNiche} onChange={setBNiche} options={[
                { value: '', label: 'General' },
                { value: 'finance', label: 'Finance' },
                { value: 'fitness', label: 'Fitness' },
                { value: 'mindset', label: 'Mindset' },
                { value: 'business', label: 'Business' },
                { value: 'tech', label: 'Tech' }
              ]} />
              <Select label="Platform" value={bPlatform} onChange={setBPlatform} options={[
                { value: 'tiktok', label: 'TikTok' },
                { value: 'reels', label: 'Reels' },
                { value: 'shorts', label: 'Shorts' },
                { value: 'youtube', label: 'YouTube' }
              ]} />
              <Select label="Tone / Style" value={bStyle} onChange={setBStyle} options={[
                { value: 'engaging', label: 'Engaging' },
                { value: 'educational', label: 'Educational' },
                { value: 'motivational', label: 'Motivational' },
                { value: 'storytelling', label: 'Storytelling' },
                { value: 'controversial', label: 'Controversial' }
              ]} />
            </div>
            <Btn onClick={submitBlotato} loading={bLoading} disabled={!bTopic.trim() || bPolling}>
              🤖 Generate Faceless Video
            </Btn>
            {error && <div style={{ color: C.red, fontSize: '13px', fontFamily: font.mono }}>{error}</div>}
          </div>
        </Card>
      )}

      {/* Kling result */}
      {mode === 'kling' && (kPolling || videoUrl || kPrompt) && (
        <Card>
          {kPrompt && <PromptBox label="Claude-Written Prompt → Kling 2.1" text={kPrompt} />}
          {kPolling && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
              <Spinner /><span style={{ color: C.textMid, fontFamily: font.sora }}>Kling 2.1 is rendering…</span>
            </div>
          )}
          {videoUrl && (
            <video src={videoUrl} controls style={{
              width: '100%', borderRadius: '10px', marginTop: '16px',
              border: `1px solid ${C.border}`, background: '#000'
            }} />
          )}
        </Card>
      )}

      {/* Blotato result */}
      {mode === 'blotato' && (bPolling || bVideoUrl || bScript) && (
        <Card>
          {bScript && <PromptBox label="Claude-Written Script → Blotato" text={bScript} color={C.blue} />}
          {bPolling && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
              <Spinner /><span style={{ color: C.textMid, fontFamily: font.sora }}>Blotato is building your video…</span>
            </div>
          )}
          {bVideoUrl && (
            <video src={bVideoUrl} controls style={{
              width: '100%', borderRadius: '10px', marginTop: '16px',
              border: `1px solid ${C.border}`, background: '#000'
            }} />
          )}
        </Card>
      )}
    </div>
  );
}

// ─── SmartPromptBuilder ───────────────────────────────────────────────────────
function SmartPromptBuilder() {
  const [topic, setTopic] = useState('');
  const [niche, setNiche] = useState('');
  const [emotion, setEmotion] = useState('');
  const [contentType, setContentType] = useState('educational');
  const [platform, setPlatform] = useState('Instagram/YouTube');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const build = async () => {
    if (!topic.trim()) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const data = await apiPost('/build-prompt', {
        contentTopic: topic, niche, targetEmotion: emotion,
        contentType, platform
      });
      setResult(data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Field label="Content Topic">
            <Input value={topic} onChange={setTopic} placeholder="e.g. How I went from broke to $10k/month in 6 months" />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <Field label="Niche">
              <Input value={niche} onChange={setNiche} placeholder="e.g. personal finance" />
            </Field>
            <Field label="Target Emotion">
              <Input value={emotion} onChange={setEmotion} placeholder="e.g. inspired, motivated" />
            </Field>
            <Select label="Content Type" value={contentType} onChange={setContentType} options={[
              { value: 'educational', label: 'Educational' },
              { value: 'inspirational', label: 'Inspirational' },
              { value: 'storytelling', label: 'Storytelling' },
              { value: 'promotional', label: 'Promotional' },
              { value: 'entertainment', label: 'Entertainment' }
            ]} />
          </div>
          <Select label="Platform" value={platform} onChange={setPlatform} options={[
            { value: 'Instagram/YouTube', label: 'Instagram / YouTube' },
            { value: 'TikTok', label: 'TikTok' },
            { value: 'LinkedIn', label: 'LinkedIn' },
            { value: 'Twitter/X', label: 'Twitter / X' }
          ]} />
          <Btn onClick={build} loading={loading} disabled={!topic.trim()}>
            ✦ Build Prompts
          </Btn>
          {error && <div style={{ color: C.red, fontSize: '13px', fontFamily: font.mono }}>{error}</div>}
        </div>
      </Card>

      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {result.visualDirection && (
            <Card>
              <div style={{ marginBottom: '10px' }}><Tag color={C.textDim}>Visual Direction</Tag></div>
              <p style={{ color: C.textMid, fontFamily: font.sora, fontSize: '14px', lineHeight: '1.7', margin: 0 }}>
                {result.visualDirection}
              </p>
            </Card>
          )}

          {result.colorPalette?.length > 0 && (
            <Card>
              <div style={{ marginBottom: '10px' }}><Tag color={C.textDim}>Color Palette</Tag></div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {result.colorPalette.map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '20px', height: '20px', borderRadius: '50%',
                      background: c, border: `1px solid ${C.border}`, flexShrink: 0
                    }} />
                    <span style={{ fontFamily: font.mono, fontSize: '12px', color: C.textMid }}>{c}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {result.imagePrompt && <PromptBox label="Nano Banana 2 — Image Prompt" text={result.imagePrompt} color={C.amber} />}
          {result.videoPrompt && <PromptBox label="Kling 2.1 — Video Prompt" text={result.videoPrompt} color={C.blue} />}

          {result.shotRecommendations?.length > 0 && (
            <Card>
              <div style={{ marginBottom: '10px' }}><Tag color={C.textDim}>Director Notes</Tag></div>
              <ul style={{ margin: 0, padding: '0 0 0 18px' }}>
                {result.shotRecommendations.map((r, i) => (
                  <li key={i} style={{ color: C.textMid, fontFamily: font.sora, fontSize: '13px', marginBottom: '6px', lineHeight: '1.5' }}>{r}</li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// ─── StoryboardGenerator ──────────────────────────────────────────────────────
function SceneImage({ taskId }) {
  const [imgUrl, setImgUrl] = useState(null);
  const [polling, setPolling] = useState(!!taskId);

  usePoll({
    endpoint: taskId ? `/image-status/${taskId}` : null,
    isActive: polling,
    intervalMs: 6000,
    onComplete: ({ data, succeeded }) => {
      setPolling(false);
      if (succeeded) {
        const url = data.images?.[0] || data.url;
        if (url) setImgUrl(url);
      }
    }
  });

  if (!taskId) return (
    <div style={{
      width: '100%', aspectRatio: '16/9', background: C.surface,
      borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: `1px solid ${C.border}`
    }}>
      <span style={{ color: C.textDim, fontSize: '12px', fontFamily: font.mono }}>No image</span>
    </div>
  );

  if (polling) return (
    <div style={{
      width: '100%', aspectRatio: '16/9', background: C.surface,
      borderRadius: '8px', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: '10px',
      border: `1px solid ${C.border}`
    }}>
      <Spinner />
      <span style={{ color: C.textDim, fontSize: '11px', fontFamily: font.mono }}>Rendering…</span>
    </div>
  );

  if (imgUrl) return (
    <img src={imgUrl} alt="Scene" style={{
      width: '100%', borderRadius: '8px', display: 'block',
      border: `1px solid ${C.border}`
    }} />
  );

  return (
    <div style={{
      width: '100%', aspectRatio: '16/9', background: C.surface,
      borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: `1px solid ${C.border}`
    }}>
      <span style={{ color: C.red, fontSize: '12px', fontFamily: font.mono }}>Failed</span>
    </div>
  );
}

function StoryboardGenerator() {
  const [sbMode, setSbMode] = useState('quick');
  const [input, setInput] = useState('');
  const [sbPlatform, setSbPlatform] = useState('youtube');
  const [sbStyle, setSbStyle] = useState('cinematic');
  const [sbNiche, setSbNiche] = useState('');
  const [loading, setLoading] = useState(false);
  const [storyboard, setStoryboard] = useState(null);
  const [activeScene, setActiveScene] = useState(0);
  const [error, setError] = useState('');
  const [exportView, setExportView] = useState(false);
  const [regenLoading, setRegenLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    if (!input.trim()) return;
    setLoading(true); setError(''); setStoryboard(null);
    try {
      const data = await apiPost('/storyboard', {
        input, mode: sbMode, platform: sbPlatform,
        style: sbStyle, niche: sbNiche
      });
      setStoryboard(data.storyboard);
      setActiveScene(0);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const regenerateScene = async (idx) => {
    if (!storyboard) return;
    setRegenLoading(true);
    try {
      const data = await apiPost('/storyboard/regenerate-scene', {
        scene: storyboard.scenes[idx],
        platform: sbPlatform, style: sbStyle
      });
      const updated = { ...storyboard };
      updated.scenes = [...storyboard.scenes];
      updated.scenes[idx] = data.updatedScene;
      setStoryboard(updated);
    } catch (err) { setError(err.message); }
    finally { setRegenLoading(false); }
  };

  const copyAllKlingPrompts = () => {
    if (!storyboard) return;
    const text = storyboard.scenes.map((s, i) =>
      `Scene ${s.sceneNumber || i + 1}: ${s.title}\n${s.videoPrompt}`
    ).join('\n\n---\n\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const scene = storyboard?.scenes?.[activeScene];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Mode toggle */}
          <div style={{ display: 'flex', gap: '4px', background: C.surface, padding: '4px', borderRadius: '10px', alignSelf: 'flex-start' }}>
            {['quick', 'script'].map(m => (
              <button key={m} onClick={() => setSbMode(m)} style={{
                padding: '7px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                fontFamily: font.sora, fontSize: '13px', fontWeight: sbMode === m ? '600' : '400',
                background: sbMode === m ? C.amber : 'transparent',
                color: sbMode === m ? '#0C0A07' : C.textDim
              }}>
                {m === 'quick' ? '⚡ Quick Topic' : '📝 Full Script'}
              </button>
            ))}
          </div>

          <Field label={sbMode === 'quick' ? 'Topic / Hook' : 'Paste Your Script'}>
            <Textarea
              value={input} onChange={setInput}
              placeholder={sbMode === 'quick'
                ? 'e.g. How I built a $5k/month content business with no face'
                : 'Paste your full script here…'}
              rows={sbMode === 'script' ? 8 : 3}
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <Select label="Platform" value={sbPlatform} onChange={setSbPlatform} options={[
              { value: 'youtube', label: 'YouTube 16:9' },
              { value: 'reels', label: 'Reels 9:16' },
              { value: 'tiktok', label: 'TikTok 9:16' },
              { value: 'shorts', label: 'Shorts 9:16' }
            ]} />
            <Select label="Visual Style" value={sbStyle} onChange={setSbStyle} options={[
              { value: 'cinematic', label: 'Cinematic' },
              { value: 'dark moody', label: 'Dark & Moody' },
              { value: 'bright clean', label: 'Bright & Clean' },
              { value: 'documentary', label: 'Documentary' },
              { value: 'aesthetic', label: 'Aesthetic' }
            ]} />
            <Field label="Niche (optional)">
              <Input value={sbNiche} onChange={setSbNiche} placeholder="e.g. business" />
            </Field>
          </div>

          <Btn onClick={generate} loading={loading} disabled={!input.trim()}>
            🎞️ Generate Storyboard
          </Btn>
          {error && <div style={{ color: C.red, fontSize: '13px', fontFamily: font.mono }}>{error}</div>}
        </div>
      </Card>

      {storyboard && (
        <>
          {/* Header bar */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: '10px'
          }}>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '700', fontFamily: font.sora, color: C.text }}>
                {storyboard.title}
              </div>
              <div style={{ fontSize: '12px', color: C.textDim, fontFamily: font.mono, marginTop: '4px' }}>
                {storyboard.scenes.length} scenes · {storyboard.totalDuration} · {storyboard.colorGrade}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Btn variant="ghost" onClick={copyAllKlingPrompts} style={{ fontSize: '12px', padding: '7px 14px' }}>
                {copied ? '✓ Copied' : '🎬 Copy All Kling Prompts'}
              </Btn>
              <Btn variant="secondary" onClick={() => setExportView(!exportView)} style={{ fontSize: '12px', padding: '7px 14px' }}>
                {exportView ? 'Scene View' : 'Export View'}
              </Btn>
            </div>
          </div>

          {/* Filmstrip thumbnail nav */}
          <div style={{
            display: 'flex', gap: '8px', overflowX: 'auto',
            paddingBottom: '8px', scrollbarWidth: 'thin'
          }}>
            {storyboard.scenes.map((s, i) => (
              <div
                key={i}
                onClick={() => setActiveScene(i)}
                style={{
                  flexShrink: 0, width: '100px', cursor: 'pointer',
                  border: `2px solid ${i === activeScene ? C.amber : C.border}`,
                  borderRadius: '6px', overflow: 'hidden', background: C.surface,
                  transition: 'border-color 0.2s'
                }}
              >
                <SceneImage taskId={s.imageTaskId} />
                <div style={{
                  padding: '4px 6px', fontSize: '10px', fontFamily: font.mono,
                  color: i === activeScene ? C.amber : C.textDim,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                }}>
                  {s.sceneNumber || i + 1}. {s.title}
                </div>
              </div>
            ))}
          </div>

          {!exportView && scene && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '16px' }}>
              {/* Large active scene view */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Card>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div>
                      <span style={{ fontSize: '12px', fontFamily: font.mono, color: C.textDim }}>
                        Scene {scene.sceneNumber || activeScene + 1}
                      </span>
                      <div style={{ fontSize: '16px', fontWeight: '600', fontFamily: font.sora, color: C.text, marginTop: '2px' }}>
                        {scene.title}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <Tag>{scene.shotType}</Tag>
                      <Tag color={C.blue}>{scene.duration}</Tag>
                    </div>
                  </div>
                  <SceneImage taskId={scene.imageTaskId} />
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <Btn variant="ghost" onClick={() => regenerateScene(activeScene)}
                      loading={regenLoading} style={{ fontSize: '12px', padding: '7px 14px' }}>
                      ↻ Regenerate Scene
                    </Btn>
                  </div>
                </Card>
                <Card>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: C.textDim, fontFamily: font.mono, textTransform: 'uppercase', marginBottom: '6px' }}>Visual Description</div>
                      <p style={{ color: C.textMid, fontSize: '13px', fontFamily: font.sora, lineHeight: '1.6', margin: 0 }}>{scene.visualDescription}</p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: C.textDim, fontFamily: font.mono, textTransform: 'uppercase', marginBottom: '4px' }}>Camera</div>
                        <div style={{ color: C.textMid, fontSize: '13px', fontFamily: font.sora }}>{scene.cameraMove}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: C.textDim, fontFamily: font.mono, textTransform: 'uppercase', marginBottom: '4px' }}>Lighting</div>
                        <div style={{ color: C.textMid, fontSize: '13px', fontFamily: font.sora }}>{scene.lightingNotes}</div>
                      </div>
                    </div>
                    <PromptBox label="Kling 2.1 — Video Prompt" text={scene.videoPrompt} color={C.blue} />
                  </div>
                </Card>
              </div>

              {/* Scene list sidebar */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '11px', color: C.textDim, fontFamily: font.mono, textTransform: 'uppercase', marginBottom: '4px' }}>
                  All Scenes
                </div>
                {storyboard.scenes.map((s, i) => (
                  <div
                    key={i}
                    onClick={() => setActiveScene(i)}
                    style={{
                      padding: '12px', borderRadius: '8px', cursor: 'pointer',
                      border: `1px solid ${i === activeScene ? C.amber : C.border}`,
                      background: i === activeScene ? C.amber + '11' : C.card,
                      transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '10px', fontFamily: font.mono, color: i === activeScene ? C.amber : C.textDim }}>
                        {s.sceneNumber || i + 1}
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: '600', fontFamily: font.sora, color: C.text }}>
                        {s.title}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: C.textDim, fontFamily: font.mono }}>{s.duration} · {s.shotType}</div>
                    <div style={{ fontSize: '12px', color: C.textMid, fontFamily: font.sora, marginTop: '4px', lineHeight: '1.4' }}>
                      {s.scriptNote}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Export view — all scenes in a flat list */}
          {exportView && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {storyboard.scenes.map((s, i) => (
                <Card key={i}>
                  <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '16px' }}>
                    <SceneImage taskId={s.imageTaskId} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <Tag>Scene {s.sceneNumber || i + 1}</Tag>
                        <Tag color={C.blue}>{s.duration}</Tag>
                        <Tag color={C.textDim}>{s.shotType}</Tag>
                      </div>
                      <div style={{ fontWeight: '600', fontFamily: font.sora, color: C.text }}>{s.title}</div>
                      <div style={{ fontSize: '13px', color: C.textMid, fontFamily: font.sora, lineHeight: '1.5' }}>{s.scriptNote}</div>
                      <PromptBox label="Kling 2.1" text={s.videoPrompt} color={C.blue} />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Main AIStudio ────────────────────────────────────────────────────────────
const TABS = [
  { id: 'image', icon: '🍌', label: 'Image Generator' },
  { id: 'video', icon: '🎬', label: 'Video Generator' },
  { id: 'builder', icon: '✦', label: 'Smart Builder' },
  { id: 'storyboard', icon: '🎞️', label: 'Storyboard' }
];

const PROVIDERS = [
  { name: 'Nano Banana 2', color: C.amber, dot: '🍌' },
  { name: 'Kling 2.1', color: C.blue, dot: '🎬' },
  { name: 'Blotato', color: C.green, dot: '🤖' },
  { name: 'Claude Opus', color: '#C084FC', dot: '✦' }
];

export default function AIStudio() {
  const [tab, setTab] = useState('image');

  return (
    <div style={{
      minHeight: '100vh', background: C.bg,
      fontFamily: font.sora, color: C.text,
      padding: '0 0 60px 0'
    }}>
      {/* Header */}
      <div style={{
        borderBottom: `1px solid ${C.border}`,
        background: C.surface,
        padding: '20px 32px',
        position: 'sticky', top: 0, zIndex: 10
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '700', fontFamily: font.sora, color: C.text }}>
                AI Studio
              </h1>
              <p style={{ margin: '2px 0 0', fontSize: '13px', color: C.textDim, fontFamily: font.mono }}>
                Images · Videos · Scripts · Storyboards
              </p>
            </div>
            {/* Provider stats row */}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              {PROVIDERS.map(p => (
                <div key={p.name} style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 12px', borderRadius: '6px',
                  background: p.color + '18', border: `1px solid ${p.color}44`
                }}>
                  <span style={{ fontSize: '14px' }}>{p.dot}</span>
                  <span style={{ fontSize: '12px', fontFamily: font.mono, color: p.color, fontWeight: '500' }}>
                    {p.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Tab nav */}
          <div style={{ display: 'flex', gap: '4px', overflowX: 'auto' }}>
            {TABS.map(t => (
              <TabButton
                key={t.id}
                active={tab === t.id}
                onClick={() => setTab(t.id)}
                icon={t.icon}
                label={t.label}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '28px 32px' }}>
        {tab === 'image' && <ImageGenerator />}
        {tab === 'video' && <VideoGenerator />}
        {tab === 'builder' && <SmartPromptBuilder />}
        {tab === 'storyboard' && <StoryboardGenerator />}
      </div>
    </div>
  );
}
