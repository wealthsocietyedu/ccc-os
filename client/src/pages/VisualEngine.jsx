import { useState, useEffect, useRef } from 'react';

const API = '/api/visual-engine';

async function apiFetch(endpoint, body, method='POST') {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API}${endpoint}`, opts);
  if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Request failed'); }
  return res.json();
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:     '#0C0A07', surface: '#1A1610', surface2: '#231E16', surface3: '#2E2720',
  border: '#2D2318', border2: '#3D3428', border3: '#5C4E38',
  amber: '#F0A800', amberMid: '#D4953A', amberDim: '#7A5820', amberText: '#FCD97A', amberSub: 'rgba(212,149,58,0.08)',
  teal: '#3D9E8C', tealDim: '#1E5050', tealText: '#6ECFBF', tealSub: 'rgba(61,158,140,0.08)',
  red: '#C42A18', redText: '#F87060', redSub: 'rgba(196,42,24,0.1)',
  text: '#F0EBE0', text2: '#A89880', text3: '#6B5E4E', text4: '#3D3428',
  font: "'Sora', sans-serif", mono: "'DM Mono', monospace",
};

// ─── Shared UI ────────────────────────────────────────────────────────────────
const Btn = ({ children, onClick, variant='primary', disabled, style={} }) => {
  const variants = {
    primary: { background: `linear-gradient(135deg,${C.amberMid},${C.amber})`, color:'#0C0A07', border:'none', boxShadow:`0 0 18px rgba(212,149,58,0.3)` },
    secondary: { background:C.surface2, color:C.text2, border:`1px solid ${C.border2}` },
    teal: { background:C.tealSub, color:C.tealText, border:`1px solid ${C.tealDim}` },
    ghost: { background:'transparent', color:C.text3, border:`1px solid ${C.border}` },
    danger: { background:C.redSub, color:C.redText, border:`1px solid ${C.red}` },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{ display:'inline-flex',alignItems:'center',gap:7,padding:'8px 16px',borderRadius:8,fontFamily:C.font,fontSize:13,fontWeight:600,cursor:disabled?'not-allowed':'pointer',opacity:disabled?0.5:1,transition:'all .15s',...variants[variant],...style }}>
      {children}
    </button>
  );
};

const Input = ({ label, value, onChange, placeholder, multiline, rows=3, style={} }) => (
  <div style={{ display:'flex',flexDirection:'column',gap:5 }}>
    {label && <label style={{ fontFamily:C.mono,fontSize:10,color:C.text3,textTransform:'uppercase',letterSpacing:'0.1em' }}>{label}</label>}
    {multiline
      ? <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows} style={{ background:C.surface,border:`1px solid ${C.border2}`,borderRadius:8,color:C.text,padding:'10px 12px',fontSize:13,fontFamily:C.font,outline:'none',resize:'vertical',...style }} />
      : <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{ background:C.surface,border:`1px solid ${C.border2}`,borderRadius:8,color:C.text,padding:'10px 12px',fontSize:13,fontFamily:C.font,outline:'none',...style }} />
    }
  </div>
);

const Select = ({ label, value, onChange, options }) => (
  <div style={{ display:'flex',flexDirection:'column',gap:5 }}>
    {label && <label style={{ fontFamily:C.mono,fontSize:10,color:C.text3,textTransform:'uppercase',letterSpacing:'0.1em' }}>{label}</label>}
    <select value={value} onChange={e=>onChange(e.target.value)} style={{ background:C.surface,border:`1px solid ${C.border2}`,borderRadius:8,color:C.text,padding:'10px 12px',fontSize:13,fontFamily:C.font,outline:'none',appearance:'none' }}>
      {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

const CopyBtn = ({ text }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={()=>{ navigator.clipboard.writeText(text); setCopied(true); setTimeout(()=>setCopied(false),2000); }} style={{ background:copied?C.tealSub:C.surface2,border:`1px solid ${copied?C.tealDim:C.border}`,borderRadius:5,color:copied?C.tealText:C.text3,padding:'4px 10px',fontSize:10,fontFamily:C.mono,cursor:'pointer',transition:'all .15s' }}>
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  );
};

const Spinner = ({ size=40 }) => (
  <div style={{ width:size,height:size,border:`3px solid ${C.amberMid}`,borderTopColor:'transparent',borderRadius:'50%',animation:'spin 1s linear infinite' }} />
);

const Tag = ({ children, color='amber' }) => {
  const colors = { amber:{bg:C.amberSub,text:C.amberText,border:C.amberDim}, teal:{bg:C.tealSub,text:C.tealText,border:C.tealDim}, neutral:{bg:C.surface2,text:C.text3,border:C.border} };
  const s = colors[color]||colors.neutral;
  return <span style={{ display:'inline-flex',alignItems:'center',padding:'2px 8px',borderRadius:4,fontFamily:C.mono,fontSize:10,background:s.bg,color:s.text,border:`1px solid ${s.border}` }}>{children}</span>;
};

// ─── Credit Bar ───────────────────────────────────────────────────────────────
function CreditBar({ credits, onRefresh }) {
  if (!credits) return null;
  const pct = Math.min(100, (credits.balance / Math.max(credits.total_earned, 100)) * 100);
  return (
    <div style={{ background:C.surface,border:`1px solid ${C.border2}`,borderRadius:10,padding:'12px 16px',display:'flex',alignItems:'center',gap:16,marginBottom:24 }}>
      <div style={{ flex:1 }}>
        <div style={{ display:'flex',alignItems:'baseline',gap:8,marginBottom:6 }}>
          <span style={{ fontSize:22,fontWeight:800,color:C.amber,letterSpacing:'-0.03em' }}>{credits.balance}</span>
          <span style={{ fontFamily:C.mono,fontSize:10,color:C.text3,textTransform:'uppercase' }}>credits remaining</span>
          <button onClick={onRefresh} style={{ marginLeft:'auto',background:'none',border:'none',color:C.text3,cursor:'pointer',fontSize:12 }}>↺</button>
        </div>
        <div style={{ height:4,background:C.border,borderRadius:2,overflow:'hidden' }}>
          <div style={{ height:'100%',width:`${pct}%`,background:`linear-gradient(90deg,${C.amberMid},${C.amber})`,borderRadius:2,transition:'width .3s' }} />
        </div>
      </div>
      <div style={{ display:'flex',gap:16 }}>
        {[['Earned',credits.total_earned],['Spent',credits.total_spent]].map(([l,v])=>(
          <div key={l} style={{ textAlign:'center' }}>
            <div style={{ fontFamily:C.mono,fontSize:9,color:C.text3,textTransform:'uppercase',marginBottom:2 }}>{l}</div>
            <div style={{ fontSize:13,fontWeight:700,color:C.text2 }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Provider Status ──────────────────────────────────────────────────────────
function ProviderStatus({ providers }) {
  if (!providers) return null;
  const list = Object.entries(providers);
  return (
    <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:24 }}>
      {list.map(([key,p])=>(
        <div key={key} style={{ background:C.surface,border:`1px solid ${p.status==='connected'?C.tealDim:p.status==='coming_soon'?C.border:C.redSub}`,borderRadius:10,padding:'12px 14px' }}>
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4 }}>
            <span style={{ fontSize:12,fontWeight:600,color:C.text }}>{p.name}</span>
            <Tag color={p.status==='connected'?'teal':p.status==='coming_soon'?'neutral':'neutral'}>
              {p.status==='connected'?'● Live':p.status==='coming_soon'?'Soon':'Setup'}
            </Tag>
          </div>
          <div style={{ fontFamily:C.mono,fontSize:9,color:C.text3,textTransform:'uppercase',marginBottom:2 }}>{p.type}</div>
          {p.credits > 0 && <div style={{ fontSize:11,color:C.amberText }}>{p.credits} credits/gen</div>}
          {p.credits === 0 && <div style={{ fontSize:11,color:C.tealText }}>Free</div>}
          {p.note && <div style={{ fontSize:10,color:C.text4,marginTop:2 }}>{p.note}</div>}
          {p.status==='not_connected' && p.setup && <div style={{ fontSize:10,color:C.text3,marginTop:4 }}>{p.setup}</div>}
        </div>
      ))}
    </div>
  );
}

// ─── Tab: Plan ────────────────────────────────────────────────────────────────
function PlanTab({ credits, onCreditUpdate }) {
  const [brief, setBrief] = useState('');
  const [niche, setNiche] = useState('');
  const [platform, setPlatform] = useState('instagram');
  const [emotion, setEmotion] = useState('inspired');
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState('');

  const handlePlan = async () => {
    if (!brief.trim()) return;
    setLoading(true); setError(''); setPlan(null);
    try {
      const d = await apiFetch('/plan', { brief, niche, platform, targetEmotion:emotion });
      setPlan(d.plan);
      onCreditUpdate();
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ display:'grid',gridTemplateColumns:'360px 1fr',gap:24 }}>
      <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
        <div style={{ background:C.amberSub,border:`1px solid ${C.amberDim}`,borderRadius:8,padding:12 }}>
          <div style={{ fontFamily:C.mono,fontSize:9,color:C.amberText,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:4 }}>✦ Content Planner</div>
          <div style={{ fontSize:12,color:C.text3 }}>Describe your content idea — Claude builds optimized prompts for every format.</div>
        </div>
        <Input label="Content Brief" value={brief} onChange={setBrief} placeholder="Morning routine that doubled my productivity..." multiline rows={4} />
        <Input label="Niche" value={niche} onChange={setNiche} placeholder="Fitness, Business, Faith, Lifestyle..." />
        <Select label="Platform" value={platform} onChange={setPlatform} options={[{value:'instagram',label:'Instagram'},{value:'youtube',label:'YouTube'},{value:'tiktok',label:'TikTok'},{value:'linkedin',label:'LinkedIn'}]} />
        <Select label="Target Emotion" value={emotion} onChange={setEmotion} options={[{value:'inspired',label:'✨ Inspired'},{value:'curious',label:'🤔 Curious'},{value:'confident',label:'💪 Confident'},{value:'peaceful',label:'🕊 Peaceful'},{value:'excited',label:'🔥 Excited'}]} />
        <Btn onClick={handlePlan} disabled={loading||!brief.trim()}>
          {loading ? '⟳ Planning...' : `✦ Plan Content (${1} credit)`}
        </Btn>
        {error && <div style={{ background:C.redSub,border:`1px solid ${C.red}`,borderRadius:8,padding:12,color:C.redText,fontSize:12,fontFamily:C.mono }}>{error}</div>}
      </div>

      <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
        {loading && (
          <div style={{ background:C.surface,border:`1px solid ${C.border2}`,borderRadius:12,minHeight:400,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12 }}>
            <Spinner /><div style={{ color:C.amberText,fontSize:13 }}>Building your content plan...</div>
          </div>
        )}
        {plan && !loading && (
          <>
            <div style={{ background:C.surface,border:`1px solid ${C.amberDim}`,borderRadius:12,padding:16 }}>
              <div style={{ fontFamily:C.mono,fontSize:10,color:C.amberText,textTransform:'uppercase',marginBottom:8 }}>Visual Direction</div>
              <p style={{ color:C.text2,fontSize:13,margin:0,lineHeight:1.6 }}>{plan.visualStyle}</p>
              <div style={{ marginTop:8,display:'flex',gap:8 }}>
                <Tag color="amber">→ {plan.recommendedProvider}</Tag>
                {plan.rationale && <span style={{ fontSize:11,color:C.text3,alignSelf:'center' }}>{plan.rationale}</span>}
              </div>
            </div>
            {[
              { key:'imagePrompt', label:'🎨 Image Prompt (FLUX)', color:C.amberSub, borderColor:C.border2 },
              { key:'videoPrompt', label:'🎬 Video Prompt (LTX-2)', color:C.amberSub, borderColor:C.amberDim },
              { key:'facelessVideoScript', label:'📱 Faceless Video Script', color:C.tealSub, borderColor:C.tealDim },
            ].map(({ key, label, color, borderColor }) => (
              <div key={key} style={{ background:color,border:`1px solid ${borderColor}`,borderRadius:12,padding:16 }}>
                <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8 }}>
                  <span style={{ fontFamily:C.mono,fontSize:10,color:C.text2,textTransform:'uppercase' }}>{label}</span>
                  <CopyBtn text={plan[key]} />
                </div>
                <p style={{ color:C.text,fontSize:13,margin:0,lineHeight:1.6 }}>{plan[key]}</p>
              </div>
            ))}
            {plan.carouselSlides && (
              <div style={{ background:C.surface,border:`1px solid ${C.border2}`,borderRadius:12,padding:16 }}>
                <div style={{ fontFamily:C.mono,fontSize:10,color:C.text3,textTransform:'uppercase',marginBottom:8 }}>📊 Carousel Slides</div>
                <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
                  {plan.carouselSlides.map((s,i)=>(
                    <div key={i} style={{ display:'flex',alignItems:'center',gap:10,padding:'8px 10px',background:C.surface2,borderRadius:6 }}>
                      <span style={{ fontFamily:C.mono,fontSize:9,color:C.amberText,width:16 }}>{i+1}</span>
                      <span style={{ fontSize:12,color:C.text2,flex:1 }}>{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        {!plan && !loading && (
          <div style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,minHeight:400,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:10 }}>
            <span style={{ fontSize:40 }}>✦</span>
            <div style={{ color:C.text4,fontSize:13,fontFamily:C.font }}>Enter your content brief to get started</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Images ──────────────────────────────────────────────────────────────
function ImageTab({ credits, onCreditUpdate }) {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('photorealistic');
  const [aspect, setAspect] = useState('16:9');
  const [useFlux, setUseFlux] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const cost = useFlux ? 2 : 0;

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const d = await apiFetch('/generate/image', { prompt, style, aspectRatio:aspect, useFlux });
      setResult(d);
      onCreditUpdate();
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ display:'grid',gridTemplateColumns:'340px 1fr',gap:24 }}>
      <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
        <Input label="Image Prompt" value={prompt} onChange={setPrompt} placeholder="Person typing on a laptop, dark minimal office, warm desk lamp, shallow depth of field..." multiline rows={4} />
        <Select label="Style" value={style} onChange={setStyle} options={[{value:'photorealistic',label:'📷 Photorealistic'},{value:'cinematic',label:'🎬 Cinematic'},{value:'artistic',label:'🎨 Artistic'},{value:'minimal',label:'⬜ Minimal'},{value:'dark',label:'🌑 Dark & Moody'},{value:'vibrant',label:'🌈 Vibrant'}]} />
        <Select label="Aspect Ratio" value={aspect} onChange={setAspect} options={[{value:'16:9',label:'16:9 — YouTube'},{value:'9:16',label:'9:16 — Reels/TikTok'},{value:'1:1',label:'1:1 — Square'},{value:'4:3',label:'4:3 — Standard'}]} />
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 12px',background:C.surface,border:`1px solid ${C.border2}`,borderRadius:8 }}>
          <div>
            <div style={{ fontSize:13,color:C.text,marginBottom:2 }}>FLUX 1.1 Pro</div>
            <div style={{ fontFamily:C.mono,fontSize:10,color:C.text3 }}>2 credits · highest quality</div>
          </div>
          <div onClick={()=>setUseFlux(!useFlux)} style={{ width:44,height:24,borderRadius:12,background:useFlux?C.amber:C.border2,position:'relative',cursor:'pointer',transition:'background .2s' }}>
            <div style={{ position:'absolute',top:2,left:useFlux?22:2,width:20,height:20,borderRadius:'50%',background:'#fff',transition:'left .2s' }} />
          </div>
        </div>
        {!useFlux && (
          <div style={{ padding:'8px 12px',background:C.tealSub,border:`1px solid ${C.tealDim}`,borderRadius:8,fontFamily:C.mono,fontSize:10,color:C.tealText }}>
            🆓 Free mode — Pollinations AI (standard quality)
          </div>
        )}
        <Btn onClick={handleGenerate} disabled={loading||!prompt.trim()}>
          {loading ? '⟳ Generating...' : `🎨 Generate Image${cost > 0 ? ` (${cost} credits)` : ' (Free)'}`}
        </Btn>
        {error && <div style={{ background:C.redSub,border:`1px solid ${C.red}`,borderRadius:8,padding:12,color:C.redText,fontSize:12,fontFamily:C.mono }}>{error}</div>}
      </div>

      <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
        <div style={{ background:C.surface,border:`1px solid ${C.border2}`,borderRadius:12,minHeight:400,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',position:'relative' }}>
          {result?.imageUrl && !loading && (
            <>
              <img src={result.imageUrl} alt="Generated" style={{ width:'100%',maxHeight:520,objectFit:'contain' }} onError={e=>e.target.style.display='none'} />
              <div style={{ position:'absolute',top:12,right:12,display:'flex',gap:8 }}>
                <a href={result.imageUrl} download="ccc-os-image.jpg" style={{ textDecoration:'none' }}>
                  <button style={{ background:'rgba(0,0,0,0.7)',border:`1px solid ${C.border3}`,borderRadius:6,color:C.text,padding:'5px 10px',fontSize:11,cursor:'pointer',fontFamily:C.mono }}>↓ Save</button>
                </a>
                <CopyBtn text={result.imageUrl} />
              </div>
              <div style={{ position:'absolute',bottom:12,left:12,display:'flex',gap:6 }}>
                <Tag color={result.provider==='flux'?'amber':'teal'}>{result.provider==='flux'?'FLUX 1.1 Pro':'Pollinations Free'}</Tag>
                <Tag color="neutral">{result.credits_used === 0 ? 'Free' : `${result.credits_used} credits`}</Tag>
              </div>
            </>
          )}
          {loading && (
            <div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:12 }}>
              <Spinner size={48} />
              <div style={{ color:C.amberText,fontSize:13 }}>Generating your image...</div>
              <div style={{ color:C.text3,fontSize:11,fontFamily:C.mono }}>FLUX: 15-30 seconds · Pollinations: 10-20 seconds</div>
            </div>
          )}
          {!result && !loading && (
            <div style={{ textAlign:'center',color:C.text4 }}>
              <div style={{ fontSize:40,marginBottom:10 }}>🎨</div>
              <div style={{ fontSize:13,fontFamily:C.font }}>Your image will appear here</div>
              <div style={{ fontSize:11,fontFamily:C.mono,marginTop:4 }}>Enter a prompt and click Generate</div>
            </div>
          )}
        </div>
        {result?.enhancedPrompt && result.enhancedPrompt !== result.originalPrompt && (
          <div style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:14 }}>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6 }}>
              <span style={{ fontFamily:C.mono,fontSize:9,color:C.amberText,textTransform:'uppercase' }}>Enhanced Prompt</span>
              <CopyBtn text={result.enhancedPrompt} />
            </div>
            <p style={{ color:C.text3,fontSize:12,margin:0,lineHeight:1.5 }}>{result.enhancedPrompt}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Video ───────────────────────────────────────────────────────────────
function VideoTab({ credits, onCreditUpdate }) {
  const [mode, setMode] = useState('faceless');
  const [topic, setTopic] = useState('');
  const [script, setScript] = useState('');
  const [subject, setSubject] = useState('');
  const [mood, setMood] = useState('warm');
  const [platform, setPlatform] = useState('reels');
  const [shotStyle, setShotStyle] = useState('cinematic');
  const [duration, setDuration] = useState('8');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState('');
  const pollRef = useRef(null);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const startPolling = (jobId) => {
    setPolling(true);
    pollRef.current = setInterval(async () => {
      try {
        const d = await apiFetch(`/status/${jobId}`, null, 'GET');
        if (d.status === 'completed') {
          clearInterval(pollRef.current);
          setPolling(false);
          setResult(prev => ({ ...prev, status:'completed', output_url:d.output_url }));
          onCreditUpdate();
        }
        if (d.status === 'failed') { clearInterval(pollRef.current); setPolling(false); setError('Video generation failed'); }
      } catch(e) { clearInterval(pollRef.current); setPolling(false); }
    }, 5000);
  };

  const handleGenerate = async () => {
    setLoading(true); setError(''); setResult(null);
    try {
      if (mode === 'faceless') {
        const d = await apiFetch('/generate/faceless-video', { topic, script, platform, visualStyle:'motivational' });
        setResult(d);
        if (d.job_id) startPolling(d.job_id);
      } else {
        const d = await apiFetch('/generate/broll', { subject, mood, platform, shotStyle, duration });
        setResult(d);
      }
      onCreditUpdate();
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ display:'grid',gridTemplateColumns:'360px 1fr',gap:24 }}>
      <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
          {[{id:'faceless',icon:'📱',label:'Faceless Video',sub:'Blotato · 25 credits'},{id:'broll',icon:'🎬',label:'B-Roll Prompt',sub:'LTX-2 · 5 credits'}].map(m=>(
            <div key={m.id} onClick={()=>{setMode(m.id);setResult(null);}} style={{ background:mode===m.id?C.amberSub:C.surface,border:`1px solid ${mode===m.id?C.amberDim:C.border2}`,borderRadius:8,padding:12,cursor:'pointer',transition:'all .15s' }}>
              <div style={{ fontSize:18,marginBottom:4 }}>{m.icon}</div>
              <div style={{ fontSize:12,fontWeight:600,color:mode===m.id?C.amberText:C.text2 }}>{m.label}</div>
              <div style={{ fontFamily:C.mono,fontSize:9,color:C.text3 }}>{m.sub}</div>
            </div>
          ))}
        </div>

        {mode === 'faceless' ? (
          <>
            <Input label="Topic" value={topic} onChange={setTopic} placeholder="5 habits that will change your life..." />
            <Input label="Script (optional — leave blank to auto-generate)" value={script} onChange={setScript} placeholder="Or paste your own script here..." multiline rows={4} />
            <Select label="Platform" value={platform} onChange={setPlatform} options={[{value:'reels',label:'Instagram Reels'},{value:'tiktok',label:'TikTok'},{value:'shorts',label:'YouTube Shorts'},{value:'youtube',label:'YouTube'}]} />
          </>
        ) : (
          <>
            <Input label="Subject / Scene" value={subject} onChange={setSubject} placeholder="Person typing on a keyboard, steam rising from coffee..." multiline rows={3} />
            <Select label="Mood" value={mood} onChange={setMood} options={[{value:'warm',label:'🌅 Warm & Golden'},{value:'dark',label:'🌑 Dark & Moody'},{value:'bright',label:'☀️ Bright & Airy'},{value:'dramatic',label:'⚡ Dramatic'},{value:'minimal',label:'⬜ Minimal'}]} />
            <Select label="Shot Style" value={shotStyle} onChange={setShotStyle} options={[{value:'cinematic',label:'🎬 Cinematic Dolly'},{value:'closeup',label:'🔍 Close-Up'},{value:'medium',label:'👤 Medium Shot'},{value:'wide',label:'🌄 Wide Shot'},{value:'overhead',label:'⬇️ Overhead'}]} />
            <Select label="Duration" value={duration} onChange={setDuration} options={[{value:'6',label:'6 seconds'},{value:'8',label:'8 seconds'},{value:'10',label:'10 seconds'}]} />
          </>
        )}

        <Btn onClick={handleGenerate} disabled={loading||(mode==='faceless'?!topic.trim():!subject.trim())}>
          {loading ? '⟳ Generating...' : mode==='faceless' ? '📱 Generate Faceless Video (25 credits)' : '🎬 Generate B-Roll Prompt (5 credits)'}
        </Btn>
        {error && <div style={{ background:C.redSub,border:`1px solid ${C.red}`,borderRadius:8,padding:12,color:C.redText,fontSize:12,fontFamily:C.mono }}>{error}</div>}
      </div>

      <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
        {(loading || polling) && (
          <div style={{ background:C.surface,border:`1px solid ${C.border2}`,borderRadius:12,minHeight:300,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12 }}>
            <Spinner size={48} />
            <div style={{ color:C.amberText,fontSize:13 }}>{loading ? 'Submitting job...' : 'Generating your video...'}</div>
            <div style={{ color:C.text3,fontSize:11,fontFamily:C.mono }}>Faceless videos take 2-3 minutes</div>
          </div>
        )}

        {result && !loading && (
          <>
            {mode === 'faceless' && (
              <div style={{ background:C.surface,border:`1px solid ${result.status==='completed'?C.amberDim:C.border2}`,borderRadius:12,padding:20 }}>
                <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14 }}>
                  <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                    <Tag color={result.status==='completed'?'amber':'neutral'}>{result.status==='completed'?'✓ Complete':'⟳ Processing'}</Tag>
                    <Tag color="neutral">Blotato</Tag>
                  </div>
                  <Tag color="neutral">{result.credits_used} credits</Tag>
                </div>
                {result.status==='completed' && result.output_url && (
                  <div style={{ marginBottom:14 }}>
                    <video src={result.output_url} controls style={{ width:'100%',borderRadius:8,maxHeight:400 }} />
                    <div style={{ display:'flex',gap:8,marginTop:10 }}>
                      <a href={result.output_url} download="ccc-os-video.mp4" style={{ textDecoration:'none' }}>
                        <Btn variant="secondary" style={{ fontSize:12,padding:'6px 14px' }}>↓ Download</Btn>
                      </a>
                      <CopyBtn text={result.output_url} />
                    </div>
                  </div>
                )}
                <div style={{ background:C.surface2,borderRadius:8,padding:12 }}>
                  <div style={{ fontFamily:C.mono,fontSize:9,color:C.text3,textTransform:'uppercase',marginBottom:6 }}>Script Used</div>
                  <p style={{ color:C.text2,fontSize:12,margin:0,lineHeight:1.6 }}>{result.script}</p>
                </div>
                {polling && (
                  <div style={{ marginTop:12,padding:10,background:C.amberSub,borderRadius:6,fontFamily:C.mono,fontSize:10,color:C.amberText }}>
                    ⟳ Polling for completion... checking every 5 seconds
                  </div>
                )}
              </div>
            )}

            {mode === 'broll' && (
              <>
                <div style={{ background:C.surface,border:`1px solid ${C.amberDim}`,borderRadius:12,padding:20 }}>
                  <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12 }}>
                    <span style={{ fontFamily:C.mono,fontSize:10,color:C.amberText,textTransform:'uppercase' }}>🎬 LTX-2 Video Prompt</span>
                    <CopyBtn text={result.prompt} />
                  </div>
                  <p style={{ color:C.text,fontSize:13,margin:0,lineHeight:1.7 }}>{result.prompt}</p>
                </div>
                <div style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:16 }}>
                  <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8 }}>
                    <span style={{ fontFamily:C.mono,fontSize:10,color:C.text3,textTransform:'uppercase' }}>Negative Prompt</span>
                    <CopyBtn text={result.negativePrompt} />
                  </div>
                  <p style={{ color:C.text3,fontSize:12,margin:0,fontFamily:C.mono,lineHeight:1.5 }}>{result.negativePrompt}</p>
                </div>
                <a href={result.ltxPlaygroundUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration:'none' }}>
                  <div style={{ background:'linear-gradient(135deg,#1A1610,#0C0A07)',border:`1px solid ${C.amberDim}`,borderRadius:12,padding:16,display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer' }}>
                    <div style={{ display:'flex',alignItems:'center',gap:12 }}>
                      <span style={{ fontSize:22 }}>🚀</span>
                      <div>
                        <div style={{ fontSize:13,color:C.text,fontWeight:600 }}>Open LTX-2 Playground</div>
                        <div style={{ fontFamily:C.mono,fontSize:10,color:C.amberText }}>Paste prompt → generate video free</div>
                      </div>
                    </div>
                    <span style={{ color:C.amberText }}>→</span>
                  </div>
                </a>
              </>
            )}
          </>
        )}

        {!result && !loading && !polling && (
          <div style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,minHeight:400,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:10 }}>
            <span style={{ fontSize:40 }}>🎬</span>
            <div style={{ color:C.text4,fontSize:13 }}>Your video will appear here</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Carousel ────────────────────────────────────────────────────────────
function CarouselTab({ credits, onCreditUpdate }) {
  const [topic, setTopic] = useState('');
  const [niche, setNiche] = useState('');
  const [platform, setPlatform] = useState('instagram');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const d = await apiFetch('/generate/carousel', { topic, niche, platform });
      setResult(d);
      onCreditUpdate();
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ display:'grid',gridTemplateColumns:'340px 1fr',gap:24 }}>
      <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
        <Input label="Carousel Topic" value={topic} onChange={setTopic} placeholder="5 reasons most people never get rich..." multiline rows={3} />
        <Input label="Niche" value={niche} onChange={setNiche} placeholder="Business, Fitness, Faith..." />
        <Select label="Platform" value={platform} onChange={setPlatform} options={[{value:'instagram',label:'Instagram'},{value:'linkedin',label:'LinkedIn'},{value:'twitter',label:'Twitter/X'}]} />
        <Btn onClick={handleGenerate} disabled={loading||!topic.trim()}>
          {loading ? '⟳ Building...' : '📊 Generate Carousel (8 credits)'}
        </Btn>
        {error && <div style={{ background:C.redSub,border:`1px solid ${C.red}`,borderRadius:8,padding:12,color:C.redText,fontSize:12,fontFamily:C.mono }}>{error}</div>}
      </div>

      <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
        {loading && (
          <div style={{ background:C.surface,border:`1px solid ${C.border2}`,borderRadius:12,minHeight:300,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12 }}>
            <Spinner /><div style={{ color:C.amberText,fontSize:13 }}>Building carousel slides...</div>
          </div>
        )}
        {result?.slides && !loading && result.slides.map((slide,i)=>(
          <div key={i} style={{ background:C.surface,border:`1px solid ${slide.type==='hook'?C.amberDim:slide.type==='cta'?C.tealDim:C.border2}`,borderRadius:10,padding:'14px 16px',display:'flex',gap:12,alignItems:'flex-start' }}>
            <div style={{ width:28,height:28,borderRadius:'50%',background:slide.type==='hook'?C.amberSub:slide.type==='cta'?C.tealSub:C.surface2,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:C.mono,fontSize:10,color:slide.type==='hook'?C.amberText:slide.type==='cta'?C.tealText:C.text3,flexShrink:0 }}>{i+1}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13,fontWeight:600,color:C.text,marginBottom:4 }}>{slide.headline}</div>
              <div style={{ fontSize:12,color:C.text3 }}>{slide.body}</div>
            </div>
            <Tag color={slide.type==='hook'?'amber':slide.type==='cta'?'teal':'neutral'}>{slide.type}</Tag>
          </div>
        ))}
        {!result && !loading && (
          <div style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,minHeight:300,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:10 }}>
            <span style={{ fontSize:40 }}>📊</span>
            <div style={{ color:C.text4,fontSize:13 }}>Your carousel slides will appear here</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab: History ─────────────────────────────────────────────────────────────
function HistoryTab() {
  const [gens, setGens] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/history', null, 'GET')
      .then(d => setGens(d.generations || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const typeIcon = { 'image-flux':'🎨','image-pollinations':'🎨','video-faceless':'📱','video-broll':'🎬','carousel':'📊','plan-prompt':'✦' };

  return (
    <div>
      {loading ? (
        <div style={{ display:'flex',justifyContent:'center',padding:40 }}><Spinner /></div>
      ) : gens.length === 0 ? (
        <div style={{ textAlign:'center',padding:60,color:C.text4 }}>No generations yet — create something!</div>
      ) : (
        <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
          {gens.map((g,i)=>(
            <div key={i} style={{ background:C.surface,border:`1px solid ${C.border2}`,borderRadius:10,padding:'12px 16px',display:'flex',gap:14,alignItems:'center' }}>
              <span style={{ fontSize:18,flexShrink:0 }}>{typeIcon[g.generation_type]||'✦'}</span>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ fontSize:12,color:C.text,fontWeight:500,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{g.prompt||g.generation_type}</div>
                <div style={{ fontFamily:C.mono,fontSize:9,color:C.text3,marginTop:2 }}>{g.provider} · {new Date(g.created_at).toLocaleDateString()}</div>
              </div>
              <Tag color={g.status==='completed'?'teal':'neutral'}>{g.status}</Tag>
              <Tag color="neutral">{g.credits_used} cr</Tag>
              {g.result_url && (
                <a href={g.result_url} target="_blank" rel="noopener noreferrer" style={{ color:C.amberText,fontSize:11,fontFamily:C.mono,textDecoration:'none' }}>View →</a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function VisualEngine() {
  const [tab, setTab] = useState('plan');
  const [credits, setCredits] = useState(null);
  const [providers, setProviders] = useState(null);

  const loadCredits = () => {
    apiFetch('/credits', null, 'GET').then(d => setCredits(d)).catch(()=>{});
  };

  const loadProviders = () => {
    apiFetch('/providers', null, 'GET').then(d => setProviders(d.providers)).catch(()=>{});
  };

  useEffect(() => { loadCredits(); loadProviders(); }, []);

  const tabs = [
    { id:'plan', icon:'✦', label:'Plan' },
    { id:'image', icon:'🎨', label:'Images' },
    { id:'video', icon:'🎬', label:'Video' },
    { id:'carousel', icon:'📊', label:'Carousel' },
    { id:'history', icon:'◉', label:'History' },
  ];

  return (
    <div style={{ minHeight:'100vh',background:C.bg,color:C.text,fontFamily:C.font,padding:32 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width:5px; }
        ::-webkit-scrollbar-track { background:${C.bg}; }
        ::-webkit-scrollbar-thumb { background:${C.border2}; border-radius:3px; }
        select option { background:${C.surface}; color:${C.text}; }
        input::placeholder, textarea::placeholder { color:${C.text4}; }
      `}</style>

      {/* Header */}
      <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:28,animation:'fadeUp .3s ease' }}>
        <div>
          <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:6 }}>
            <div style={{ fontFamily:C.mono,fontSize:10,color:C.amberText,textTransform:'uppercase',letterSpacing:'0.12em' }}>——</div>
            <div style={{ fontFamily:C.mono,fontSize:10,color:C.amberText,textTransform:'uppercase',letterSpacing:'0.12em' }}>Visual Engine</div>
          </div>
          <h1 style={{ margin:0,fontSize:26,fontWeight:800,color:C.text,letterSpacing:'-0.03em' }}>AI Content Studio</h1>
          <p style={{ margin:'6px 0 0',fontSize:13,color:C.text3 }}>Images · Faceless video · Carousels · B-roll prompts — all in one place</p>
        </div>
        <div style={{ display:'flex',gap:8,alignItems:'center' }}>
          {credits && (
            <div style={{ padding:'6px 14px',background:C.amberSub,border:`1px solid ${C.amberDim}`,borderRadius:20,fontFamily:C.mono,fontSize:11,color:C.amberText }}>
              ✦ {credits.balance} credits
            </div>
          )}
        </div>
      </div>

      {/* Credit Bar */}
      <CreditBar credits={credits} onRefresh={loadCredits} />

      {/* Provider Status */}
      <ProviderStatus providers={providers} />

      {/* Tabs */}
      <div style={{ display:'flex',gap:4,background:C.surface,borderRadius:10,padding:4,width:'fit-content',marginBottom:28,border:`1px solid ${C.border2}` }}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{ display:'flex',alignItems:'center',gap:7,padding:'8px 18px',borderRadius:8,border:'none',cursor:'pointer',fontSize:13,fontFamily:C.font,fontWeight:tab===t.id?600:400,background:tab===t.id?C.amber:'transparent',color:tab===t.id?'#0C0A07':C.text3,transition:'all .15s' }}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ animation:'fadeUp .25s ease' }}>
        {tab==='plan'     && <PlanTab credits={credits} onCreditUpdate={loadCredits} />}
        {tab==='image'    && <ImageTab credits={credits} onCreditUpdate={loadCredits} />}
        {tab==='video'    && <VideoTab credits={credits} onCreditUpdate={loadCredits} />}
        {tab==='carousel' && <CarouselTab credits={credits} onCreditUpdate={loadCredits} />}
        {tab==='history'  && <HistoryTab />}
      </div>
    </div>
  );
}
