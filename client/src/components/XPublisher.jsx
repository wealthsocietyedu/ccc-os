import { useState, useEffect, useRef } from 'react';

const API = '/api/x-publisher';

function getToken() {
  return localStorage.getItem('ccc_token') || '';
}

async function apiFetch(endpoint, body, method = 'POST') {
  const res = await fetch(`${API}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`
    },
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ─── SHARED UI ────────────────────────────────────────────────────────────────

const S = {
  panel: { background: '#1A1A2E', border: '1px solid #2D2D44', borderRadius: '12px', padding: '20px' },
  inner: { background: '#0A0A1F', border: '1px solid #2D2D44', borderRadius: '10px', padding: '16px' },
  label: { fontSize: '11px', color: '#9CA3AF', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' },
  input: { background: '#0D0D1A', border: '1px solid #2D2D44', borderRadius: '8px', color: '#E5E7EB', padding: '10px 12px', fontSize: '14px', fontFamily: 'Sora, sans-serif', outline: 'none', width: '100%', boxSizing: 'border-box' },
};

function TabBtn({ active, onClick, label, icon }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontFamily: 'Sora, sans-serif', fontWeight: active ? '600' : '400', background: active ? '#F0A800' : 'transparent', color: active ? '#0C0A07' : '#9CA3AF', transition: 'all 0.2s' }}>
      <span>{icon}</span>{label}
    </button>
  );
}

function Btn({ onClick, loading, label, icon, variant = 'primary', disabled, style = {} }) {
  return (
    <button onClick={onClick} disabled={loading || disabled} style={{ background: loading || disabled ? '#2D2D44' : variant === 'primary' ? '#F0A800' : '#1A1A2E', border: variant === 'primary' ? 'none' : '1px solid #2D2D44', borderRadius: '9px', color: variant === 'primary' ? '#0C0A07' : '#E5E7EB', padding: '10px 18px', fontSize: '14px', fontWeight: '600', fontFamily: 'Sora, sans-serif', cursor: loading || disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '7px', opacity: loading || disabled ? 0.6 : 1, transition: 'all 0.2s', ...style }}>
      <span>{loading ? '⟳' : icon}</span>{loading ? 'Working...' : label}
    </button>
  );
}

function Err({ msg }) {
  if (!msg) return null;
  return <div style={{ background: '#1F0A0A', border: '1px solid #7F1D1D', borderRadius: '8px', padding: '10px 14px', color: '#FCA5A5', fontSize: '13px', fontFamily: 'DM Mono, monospace' }}>{msg}</div>;
}

function StatusBadge({ status }) {
  const colors = {
    draft: { bg: '#1A1A2E', color: '#6B7280', border: '#2D2D44' },
    scheduled: { bg: '#0A1A2E', color: '#60A5FA', border: '#1E3A5F' },
    published: { bg: '#0A1A0A', color: '#4ADE80', border: '#1A3A1A' },
    failed: { bg: '#1F0A0A', color: '#FCA5A5', border: '#7F1D1D' },
    cancelled: { bg: '#1A1A1A', color: '#4B5563', border: '#2D2D2D' },
  };
  const c = colors[status] || colors.draft;
  return (
    <span style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: '20px', color: c.color, padding: '2px 10px', fontSize: '11px', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase' }}>
      {status}
    </span>
  );
}

function CharCounter({ text, max = 280 }) {
  const len = text?.length || 0;
  const remaining = max - len;
  const color = remaining < 0 ? '#EF4444' : remaining < 20 ? '#F0A800' : '#6B7280';
  return (
    <span style={{ fontSize: '12px', color, fontFamily: 'DM Mono, monospace' }}>
      {remaining}
    </span>
  );
}

// ─── ACCOUNT SELECTOR ─────────────────────────────────────────────────────────

function AccountSelector({ accounts, selectedId, onChange }) {
  if (!accounts.length) return (
    <div style={{ padding: '10px 14px', background: '#1A1A2E', border: '1px solid #2D2D44', borderRadius: '8px', fontSize: '13px', color: '#6B7280', fontFamily: 'Sora, sans-serif' }}>
      No accounts connected — add one in the Accounts tab
    </div>
  );

  return (
    <select value={selectedId} onChange={e => onChange(e.target.value)} style={{ ...S.input, appearance: 'none' }}>
      <option value="">Select account...</option>
      {accounts.map(a => (
        <option key={a.id} value={a.id}>@{a.username || a.display_name}</option>
      ))}
    </select>
  );
}

// ─── TAB 1: COMPOSE ───────────────────────────────────────────────────────────

function ComposeTab({ accounts }) {
  const [accountId, setAccountId] = useState('');
  const [content, setContent] = useState('');
  const [topic, setTopic] = useState('');
  const [mode, setMode] = useState('manual');
  const [scheduledAt, setScheduledAt] = useState('');
  const [postType, setPostType] = useState('now');
  const [loading, setLoading] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Set first account as default
  useEffect(() => {
    if (accounts.length && !accountId) setAccountId(accounts[0].id);
  }, [accounts]);

  const draft = async () => {
    if (!topic.trim()) return;
    setDrafting(true); setError('');
    try {
      const d = await apiFetch('/draft', { topic, accountId });
      setContent(d.draft);
    } catch (e) { setError(e.message); }
    finally { setDrafting(false); }
  };

  const enhance = async () => {
    if (!content.trim()) return;
    setEnhancing(true); setError('');
    try {
      const d = await apiFetch('/enhance', { content });
      setContent(d.enhanced);
    } catch (e) { setError(e.message); }
    finally { setEnhancing(false); }
  };

  const submit = async () => {
    if (!accountId || !content.trim()) return;
    if (content.length > 280) { setError('Tweet exceeds 280 characters'); return; }
    setLoading(true); setError(''); setSuccess('');

    try {
      if (postType === 'now') {
        await apiFetch('/post', { accountId, content });
        setSuccess('Posted successfully!');
        setContent('');
        setTopic('');
      } else {
        if (!scheduledAt) { setError('Pick a date and time'); setLoading(false); return; }
        await apiFetch('/schedule', { accountId, content, scheduledAt, mode });
        setSuccess('Scheduled!');
        setContent('');
        setTopic('');
        setScheduledAt('');
      }
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const modes = [
    { id: 'manual', icon: '✏️', label: 'Write it yourself' },
    { id: 'ai_assist', icon: '✦', label: 'AI writes, you approve' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>
      {/* Left: Compose */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Mode selector */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {modes.map(m => (
            <div key={m.id} onClick={() => setMode(m.id)} style={{ padding: '12px', background: mode === m.id ? '#0A1A0A' : '#1A1A2E', border: `1px solid ${mode === m.id ? '#F0A800' : '#2D2D44'}`, borderRadius: '8px', cursor: 'pointer', transition: 'all 0.15s' }}>
              <div style={{ fontSize: '16px', marginBottom: '4px' }}>{m.icon}</div>
              <div style={{ fontSize: '12px', color: mode === m.id ? '#F0A800' : '#9CA3AF', fontFamily: 'Sora, sans-serif', fontWeight: '500' }}>{m.label}</div>
            </div>
          ))}
        </div>

        {/* Account selector */}
        <div>
          <div style={S.label}>Post as</div>
          <AccountSelector accounts={accounts} selectedId={accountId} onChange={setAccountId} />
        </div>

        {/* AI Assist topic input */}
        {mode === 'ai_assist' && (
          <div>
            <div style={S.label}>Topic or idea</div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input value={topic} onChange={e => setTopic(e.target.value)} onKeyDown={e => e.key === 'Enter' && draft()} placeholder="What should Claude write about?" style={{ ...S.input, flex: 1 }} />
              <Btn onClick={draft} loading={drafting} label="Draft" icon="✦" />
            </div>
          </div>
        )}

        {/* Tweet textarea */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <div style={S.label}>Tweet</div>
            <CharCounter text={content} />
          </div>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder={mode === 'manual' ? "What's happening?" : "Your draft will appear here — edit freely before posting"}
            rows={5}
            style={{ ...S.input, resize: 'vertical', lineHeight: '1.6', border: content.length > 280 ? '1px solid #EF4444' : '1px solid #2D2D44' }}
          />
          {content && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <Btn onClick={enhance} loading={enhancing} label="Enhance" icon="↑" variant="secondary" style={{ fontSize: '12px', padding: '7px 14px' }} />
            </div>
          )}
        </div>

        {/* Post type */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {[['now', '⚡', 'Post now'], ['schedule', '🕐', 'Schedule']].map(([id, icon, label]) => (
            <div key={id} onClick={() => setPostType(id)} style={{ padding: '10px 14px', background: postType === id ? '#0A1A0A' : '#1A1A2E', border: `1px solid ${postType === id ? '#F0A800' : '#2D2D44'}`, borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.15s' }}>
              <span style={{ fontSize: '16px' }}>{icon}</span>
              <span style={{ fontSize: '13px', color: postType === id ? '#F0A800' : '#9CA3AF', fontFamily: 'Sora, sans-serif', fontWeight: '500' }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Date/time picker */}
        {postType === 'schedule' && (
          <div>
            <div style={S.label}>Schedule for</div>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={e => setScheduledAt(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              style={{ ...S.input, colorScheme: 'dark' }}
            />
          </div>
        )}

        <Btn
          onClick={submit}
          loading={loading}
          label={postType === 'now' ? 'Post Now' : 'Schedule Post'}
          icon={postType === 'now' ? '𝕏' : '🕐'}
          disabled={!accountId || !content.trim() || content.length > 280}
        />

        {success && (
          <div style={{ padding: '12px 14px', background: '#0A1A0A', border: '1px solid #1A3A1A', borderRadius: '8px', color: '#4ADE80', fontSize: '13px', fontFamily: 'Sora, sans-serif' }}>
            ✅ {success}
          </div>
        )}
        <Err msg={error} />
      </div>

      {/* Right: Tips */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={S.panel}>
          <div style={{ ...S.label, marginBottom: '12px' }}>✦ Writing Tips</div>
          {[
            { tip: 'Hook in line 1', desc: 'First line decides if they read the rest' },
            { tip: 'One idea only', desc: 'Threads are for multiple ideas' },
            { tip: 'No hashtags', desc: 'They reduce reach on X now' },
            { tip: 'End with value', desc: 'Make the last line worth sharing' },
            { tip: 'Under 200 chars', desc: 'Shorter tweets get more engagement' },
          ].map(({ tip, desc }) => (
            <div key={tip} style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #2D2D44' }}>
              <div style={{ fontSize: '12px', color: '#F0A800', fontFamily: 'DM Mono, monospace', marginBottom: '2px' }}>{tip}</div>
              <div style={{ fontSize: '12px', color: '#6B7280', fontFamily: 'Sora, sans-serif' }}>{desc}</div>
            </div>
          ))}
        </div>

        {/* Character breakdown */}
        {content && (
          <div style={S.panel}>
            <div style={S.label}>Character count</div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: content.length > 280 ? '#EF4444' : '#F0A800', fontFamily: 'DM Mono, monospace', marginBottom: '4px' }}>
              {content.length}
              <span style={{ fontSize: '16px', color: '#6B7280' }}>/280</span>
            </div>
            <div style={{ fontSize: '11px', color: '#6B7280', fontFamily: 'DM Mono, monospace' }}>
              {280 - content.length} characters remaining
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TAB 2: QUEUE ─────────────────────────────────────────────────────────────

function QueueTab({ accounts }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [accountFilter, setAccountFilter] = useState('all');
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('status', filter);
      if (accountFilter !== 'all') params.set('accountId', accountFilter);

      const res = await fetch(`${API}/queue?${params}`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const d = await res.json();
      setPosts(d.posts || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filter, accountFilter]);

  const cancel = async (id) => {
    try {
      await apiFetch(`/queue/${id}`, undefined, 'DELETE');
      load();
    } catch (e) { setError(e.message); }
  };

  const retry = async (id) => {
    try {
      await apiFetch(`/queue/${id}/retry`, {});
      load();
    } catch (e) { setError(e.message); }
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const statusCounts = posts.reduce((acc, p) => { acc[p.status] = (acc[p.status] || 0) + 1; return acc; }, {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
        {[['scheduled', '🕐', '#60A5FA'], ['published', '✅', '#4ADE80'], ['failed', '❌', '#FCA5A5'], ['cancelled', '○', '#4B5563']].map(([s, icon, color]) => (
          <div key={s} style={{ ...S.panel, padding: '12px', textAlign: 'center', cursor: 'pointer', border: filter === s ? `1px solid ${color}` : '1px solid #2D2D44' }} onClick={() => setFilter(filter === s ? 'all' : s)}>
            <div style={{ fontSize: '16px', marginBottom: '4px' }}>{icon}</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color, fontFamily: 'DM Mono, monospace' }}>{statusCounts[s] || 0}</div>
            <div style={{ fontSize: '11px', color: '#6B7280', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase' }}>{s}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <select value={filter} onChange={e => setFilter(e.target.value)} style={{ ...S.input, width: '160px', appearance: 'none' }}>
          <option value="all">All statuses</option>
          <option value="scheduled">Scheduled</option>
          <option value="published">Published</option>
          <option value="failed">Failed</option>
          <option value="draft">Draft</option>
        </select>
        <select value={accountFilter} onChange={e => setAccountFilter(e.target.value)} style={{ ...S.input, width: '200px', appearance: 'none' }}>
          <option value="all">All accounts</option>
          {accounts.map(a => <option key={a.id} value={a.id}>@{a.username || a.display_name}</option>)}
        </select>
        <Btn onClick={load} loading={loading} label="Refresh" icon="↻" variant="secondary" style={{ fontSize: '12px', padding: '8px 14px' }} />
      </div>

      <Err msg={error} />

      {/* Posts list */}
      {!loading && posts.length === 0 && (
        <div style={{ ...S.panel, textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '32px', marginBottom: '10px' }}>📭</div>
          <div style={{ color: '#6B7280', fontFamily: 'Sora, sans-serif' }}>No posts found</div>
        </div>
      )}

      {posts.map(post => (
        <div key={post.id} style={{ ...S.panel, padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <StatusBadge status={post.status} />
              <span style={{ fontSize: '12px', color: '#6B7280', fontFamily: 'DM Mono, monospace' }}>
                @{post.account_username || post.account_name}
              </span>
              <span style={{ fontSize: '11px', color: '#4B5563', fontFamily: 'DM Mono, monospace' }}>
                {post.mode}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#6B7280', fontFamily: 'DM Mono, monospace', textAlign: 'right' }}>
              {post.status === 'scheduled' && <div>📅 {formatDate(post.scheduled_at)}</div>}
              {post.status === 'published' && <div>✅ {formatDate(post.posted_at)}</div>}
            </div>
          </div>

          <div style={{ fontSize: '14px', color: '#E5E7EB', fontFamily: 'Sora, sans-serif', lineHeight: '1.6', marginBottom: '12px', padding: '10px', background: '#0D0D1A', borderRadius: '8px' }}>
            {post.content}
          </div>

          {post.error_message && (
            <div style={{ fontSize: '12px', color: '#FCA5A5', fontFamily: 'DM Mono, monospace', marginBottom: '10px' }}>
              Error: {post.error_message}
            </div>
          )}

          {post.tweet_id && (
            <a href={`https://x.com/i/status/${post.tweet_id}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: '#1DA1F2', fontFamily: 'DM Mono, monospace', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '10px' }}>
              𝕏 View on X →
            </a>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            {post.status === 'scheduled' && (
              <Btn onClick={() => cancel(post.id)} label="Cancel" icon="×" variant="secondary" style={{ fontSize: '12px', padding: '6px 12px' }} />
            )}
            {post.status === 'failed' && (
              <Btn onClick={() => retry(post.id)} label="Retry" icon="↻" style={{ fontSize: '12px', padding: '6px 12px' }} />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── TAB 3: AUTOPILOT ─────────────────────────────────────────────────────────

function AutopilotTab({ accounts }) {
  const [configs, setConfigs] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [days, setDays] = useState(['monday', 'wednesday', 'friday']);
  const [time, setTime] = useState('09:00');
  const [direction, setDirection] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const ALL_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  useEffect(() => {
    if (accounts.length && !selectedAccount) setSelectedAccount(accounts[0].id);
    loadConfigs();
  }, [accounts]);

  useEffect(() => {
    // Load config for selected account
    const existing = configs.find(c => c.account_id === selectedAccount);
    if (existing) {
      try { setDays(JSON.parse(existing.schedule_days)); } catch (e) {}
      setTime(existing.schedule_time || '09:00');
      setDirection(existing.content_direction || '');
    } else {
      setDays(['monday', 'wednesday', 'friday']);
      setTime('09:00');
      setDirection('');
    }
  }, [selectedAccount, configs]);

  const loadConfigs = async () => {
    try {
      const d = await apiFetch('/autopilot', undefined, 'GET');
      setConfigs(d.configs || []);
    } catch (e) {}
  };

  const toggleDay = (day) => {
    setDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const save = async () => {
    if (!selectedAccount) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      await apiFetch('/autopilot', { accountId: selectedAccount, scheduleDays: days, scheduleTime: time, contentDirection: direction });
      setSuccess('Autopilot config saved');
      loadConfigs();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const toggle = async (accountId, currentState) => {
    setToggling(accountId);
    try {
      await apiFetch('/autopilot/toggle', { accountId, isActive: !currentState });
      loadConfigs();
    } catch (e) { setError(e.message); }
    finally { setToggling(''); }
  };

  const getConfig = (accountId) => configs.find(c => c.account_id === accountId);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px' }}>
      {/* Left: Config */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={S.panel}>
          <div style={{ ...S.label, marginBottom: '12px' }}>Configure Autopilot</div>

          {/* Account */}
          <div style={{ marginBottom: '14px' }}>
            <div style={S.label}>Account</div>
            <AccountSelector accounts={accounts} selectedId={selectedAccount} onChange={setSelectedAccount} />
          </div>

          {/* Days */}
          <div style={{ marginBottom: '14px' }}>
            <div style={S.label}>Post on</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {ALL_DAYS.map(day => (
                <div key={day} onClick={() => toggleDay(day)} style={{ padding: '6px 12px', borderRadius: '20px', cursor: 'pointer', fontSize: '12px', fontFamily: 'DM Mono, monospace', background: days.includes(day) ? '#F0A800' : '#1A1A2E', color: days.includes(day) ? '#0C0A07' : '#9CA3AF', border: `1px solid ${days.includes(day) ? '#F0A800' : '#2D2D44'}`, transition: 'all 0.15s', textTransform: 'capitalize' }}>
                  {day.slice(0, 3)}
                </div>
              ))}
            </div>
          </div>

          {/* Time */}
          <div style={{ marginBottom: '14px' }}>
            <div style={S.label}>Post time</div>
            <input type="time" value={time} onChange={e => setTime(e.target.value)} style={{ ...S.input, width: '160px', colorScheme: 'dark' }} />
          </div>

          {/* Content direction */}
          <div style={{ marginBottom: '16px' }}>
            <div style={S.label}>Content direction</div>
            <textarea
              value={direction}
              onChange={e => setDirection(e.target.value)}
              placeholder="e.g. Post about faith, mindset, and building wealth. Focus on motivation and discipline. Audience is ambitious 25-40 year olds."
              rows={4}
              style={{ ...S.input, resize: 'vertical', lineHeight: '1.6' }}
            />
            <div style={{ fontSize: '11px', color: '#4B5563', fontFamily: 'DM Mono, monospace', marginTop: '4px' }}>
              Claude uses your Idea Vault first. This is the fallback when the vault runs low.
            </div>
          </div>

          <Btn onClick={save} loading={saving} label="Save Config" icon="✓" />
          {success && <div style={{ fontSize: '13px', color: '#4ADE80', fontFamily: 'DM Mono, monospace', marginTop: '8px' }}>✅ {success}</div>}
          <Err msg={error} />
        </div>
      </div>

      {/* Right: Account status */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ ...S.label, marginBottom: '0' }}>Account Status</div>
        {accounts.length === 0 && (
          <div style={{ ...S.panel, textAlign: 'center', padding: '30px' }}>
            <div style={{ color: '#6B7280', fontSize: '13px', fontFamily: 'Sora, sans-serif' }}>No accounts connected</div>
          </div>
        )}
        {accounts.map(account => {
          const config = getConfig(account.id);
          const isActive = config?.is_active === 1;
          const isToggling = toggling === account.id;

          return (
            <div key={account.id} style={{ ...S.panel, padding: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div>
                  <div style={{ fontSize: '13px', color: '#E5E7EB', fontFamily: 'Sora, sans-serif', fontWeight: '600' }}>
                    @{account.username || account.display_name}
                  </div>
                  {config && (
                    <div style={{ fontSize: '11px', color: '#6B7280', fontFamily: 'DM Mono, monospace', marginTop: '2px' }}>
                      {(() => { try { return JSON.parse(config.schedule_days).map(d => d.slice(0,3)).join(', '); } catch(e) { return ''; } })()} at {config.schedule_time}
                    </div>
                  )}
                </div>
                {/* Toggle */}
                {config && (
                  <div onClick={() => !isToggling && toggle(account.id, isActive)} style={{ width: '44px', height: '24px', borderRadius: '12px', cursor: 'pointer', background: isActive ? '#F0A800' : '#2D2D44', position: 'relative', transition: 'background 0.2s', opacity: isToggling ? 0.5 : 1 }}>
                    <div style={{ position: 'absolute', top: '2px', left: isActive ? '22px' : '2px', width: '20px', height: '20px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                  </div>
                )}
              </div>

              {isActive && config && (
                <div style={{ fontSize: '11px', color: '#4ADE80', fontFamily: 'DM Mono, monospace', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  ● Autopilot active
                </div>
              )}
              {!config && (
                <div style={{ fontSize: '11px', color: '#4B5563', fontFamily: 'DM Mono, monospace' }}>
                  No config — save settings to enable
                </div>
              )}
              {config && !isActive && (
                <div style={{ fontSize: '11px', color: '#6B7280', fontFamily: 'DM Mono, monospace' }}>
                  ○ Autopilot off
                </div>
              )}
            </div>
          );
        })}

        {/* Vault status */}
        <div style={{ ...S.panel, padding: '14px', background: '#0A1A0A', border: '1px solid #1A3A1A' }}>
          <div style={{ fontSize: '11px', color: '#4ADE80', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', marginBottom: '6px' }}>✦ Content Source</div>
          <div style={{ fontSize: '12px', color: '#6B7280', fontFamily: 'Sora, sans-serif', lineHeight: '1.6' }}>
            Autopilot pulls from your <strong style={{ color: '#E5E7EB' }}>Idea Vault</strong> first. When ideas run low, it falls back to your content direction. Keep adding ideas to the vault to keep your feed fresh.
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── TAB 4: ACCOUNTS ──────────────────────────────────────────────────────────

function AccountsTab({ accounts, onRefresh }) {
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState('');
  const [testResults, setTestResults] = useState({});
  const [error, setError] = useState('');

  const connectAccount = async () => {
    setConnecting(true);
    setError('');

    let authUrl;
    try {
      const d = await apiFetch('/auth/start', undefined, 'GET');
      authUrl = d.authUrl;
    } catch (e) {
      setError(e.message || 'Failed to start OAuth flow');
      setConnecting(false);
      return;
    }

    const popup = window.open(authUrl, 'x_oauth', 'width=600,height=700,left=200,top=100');

    const handleMessage = (e) => {
      const t = e.data?.type;
      if (t !== 'X_AUTH_SUCCESS' && t !== 'X_AUTH_DENIED' && t !== 'X_AUTH_ERROR') return;
      window.removeEventListener('message', handleMessage);
      setConnecting(false);
      if (t === 'X_AUTH_SUCCESS') {
        onRefresh();
      } else {
        setError(t === 'X_AUTH_DENIED' ? 'Authorization denied on X' : (e.data.error || 'Authorization failed'));
      }
    };

    window.addEventListener('message', handleMessage);

    // Clean up if popup closes without sending message
    const pollClosed = setInterval(() => {
      if (!popup || popup.closed) {
        clearInterval(pollClosed);
        window.removeEventListener('message', handleMessage);
        setConnecting(false);
      }
    }, 500);
  };

  const test = async (id) => {
    setTesting(id);
    try {
      const d = await apiFetch(`/accounts/${id}/test`, {});
      setTestResults(prev => ({ ...prev, [id]: d }));
      onRefresh();
    } catch (e) {
      setTestResults(prev => ({ ...prev, [id]: { valid: false, error: e.message } }));
    } finally { setTesting(''); }
  };

  const remove = async (id) => {
    if (!confirm('Remove this account? All scheduled posts for this account will be cancelled.')) return;
    try {
      await apiFetch(`/accounts/${id}`, undefined, 'DELETE');
      onRefresh();
    } catch (e) { setError(e.message); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Connected accounts */}
      {accounts.map(account => {
        const result = testResults[account.id];
        return (
          <div key={account.id} style={S.panel}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#1A1A2E', border: '1px solid #2D2D44', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: '#1DA1F2' }}>𝕏</div>
                <div>
                  <div style={{ fontSize: '14px', color: '#E5E7EB', fontFamily: 'Sora, sans-serif', fontWeight: '600' }}>
                    {account.display_name || account.username || 'Account ' + account.slot}
                  </div>
                  {account.username && (
                    <div style={{ fontSize: '12px', color: '#6B7280', fontFamily: 'DM Mono, monospace' }}>@{account.username}</div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {result && (
                  <span style={{ fontSize: '12px', color: result.valid ? '#4ADE80' : '#FCA5A5', fontFamily: 'DM Mono, monospace' }}>
                    {result.valid ? '✓ Connected' : '✗ ' + result.error}
                  </span>
                )}
                <Btn onClick={() => test(account.id)} loading={testing === account.id} label="Test" icon="⚡" variant="secondary" style={{ fontSize: '12px', padding: '6px 12px' }} />
                <Btn onClick={() => remove(account.id)} label="Remove" icon="×" variant="secondary" style={{ fontSize: '12px', padding: '6px 12px', color: '#EF4444' }} />
              </div>
            </div>
          </div>
        );
      })}

      {/* Connect button */}
      {accounts.length < 5 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <Btn
            onClick={connectAccount}
            loading={connecting}
            label={connecting ? 'Waiting for authorization…' : `Connect X Account (${accounts.length}/5)`}
            icon="𝕏"
            variant="secondary"
          />
          <Err msg={error} />
        </div>
      )}

      {accounts.length === 0 && !connecting && (
        <div style={{ ...S.panel, textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>𝕏</div>
          <div style={{ color: '#E5E7EB', fontSize: '15px', fontFamily: 'Sora, sans-serif', marginBottom: '8px' }}>No accounts connected yet</div>
          <div style={{ color: '#6B7280', fontSize: '13px', fontFamily: 'Sora, sans-serif' }}>Click "Connect X Account" to authorize via X</div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export default function XPublisher() {
  const [activeTab, setActiveTab] = useState('compose');
  const [accounts, setAccounts] = useState([]);

  const loadAccounts = async () => {
    try {
      const d = await apiFetch('/accounts', undefined, 'GET');
      setAccounts(d.accounts || []);
    } catch (e) {}
  };

  useEffect(() => { loadAccounts(); }, []);

  const tabs = [
    { id: 'compose', icon: '✏️', label: 'Compose' },
    { id: 'queue', icon: '📅', label: 'Queue' },
    { id: 'autopilot', icon: '⚡', label: 'Autopilot' },
    { id: 'accounts', icon: '𝕏', label: 'Accounts' },
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
        input[type="datetime-local"]::-webkit-calendar-picker-indicator { filter: invert(1); }
        input[type="time"]::-webkit-calendar-picker-indicator { filter: invert(1); }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '6px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '11px', background: '#000', border: '1px solid #2D2D44', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: '#fff', boxShadow: '0 0 20px rgba(29,161,242,0.2)' }}>𝕏</div>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: '#fff', letterSpacing: '-0.02em' }}>X Publisher</h1>
            <p style={{ margin: 0, fontSize: '12px', color: '#6B7280', fontFamily: 'DM Mono, monospace' }}>
              Post · Schedule · Autopilot — {accounts.length}/5 accounts connected
            </p>
          </div>
          {accounts.length > 0 && (
            <div style={{ marginLeft: 'auto', padding: '4px 12px', background: '#0A1A0A', border: '1px solid #1A3A1A', borderRadius: '20px', fontSize: '11px', color: '#4ADE80', fontFamily: 'DM Mono, monospace' }}>
              ● {accounts.filter(a => a.is_active).length} active
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '3px', background: '#1A1A2E', borderRadius: '10px', padding: '4px', width: 'fit-content', marginBottom: '22px', border: '1px solid #2D2D44' }}>
        {tabs.map(t => <TabBtn key={t.id} active={activeTab === t.id} onClick={() => setActiveTab(t.id)} label={t.label} icon={t.icon} />)}
      </div>

      {/* Content */}
      {activeTab === 'compose' && <ComposeTab accounts={accounts} />}
      {activeTab === 'queue' && <QueueTab accounts={accounts} />}
      {activeTab === 'autopilot' && <AutopilotTab accounts={accounts} />}
      {activeTab === 'accounts' && <AccountsTab accounts={accounts} onRefresh={loadAccounts} />}
    </div>
  );
}
