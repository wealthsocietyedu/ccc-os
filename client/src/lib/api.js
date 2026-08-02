// client/src/lib/api.js
// Centralized API client — all server calls go through here

const BASE = '/api';

const getToken = () => localStorage.getItem('ccc_token');

const headers = (extra = {}) => ({
  'Content-Type': 'application/json',
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
  ...extra,
});

const handle = async (res) => {
  const data = await res.json();
  if (!res.ok) {
    const err = Object.assign(new Error(data.error || `HTTP ${res.status}`), data, { status: res.status });
    throw err;
  }
  return data;
};

// ─── AUTH ─────────────────────────────────────────────────────────────────────
export const auth = {
  register: (name, email, password) =>
    fetch(`${BASE}/auth/register`, { method: 'POST', headers: headers(), body: JSON.stringify({ name, email, password }) }).then(handle),
  login: (email, password) =>
    fetch(`${BASE}/auth/login`, { method: 'POST', headers: headers(), body: JSON.stringify({ email, password }) }).then(handle),
  me: () => fetch(`${BASE}/auth/me`, { headers: headers() }).then(handle),
  update: (data) => fetch(`${BASE}/auth/me`, { method: 'PATCH', headers: headers(), body: JSON.stringify(data) }).then(handle),
};

// ─── BRANDS ──────────────────────────────────────────────────────────────────
export const brands = {
  list: () => fetch(`${BASE}/brands`, { headers: headers() }).then(handle),
  create: (data) => fetch(`${BASE}/brands`, { method: 'POST', headers: headers(), body: JSON.stringify(data) }).then(handle),
  update: (id, data) => fetch(`${BASE}/brands/${id}`, { method: 'PATCH', headers: headers(), body: JSON.stringify(data) }).then(handle),
  delete: (id) => fetch(`${BASE}/brands/${id}`, { method: 'DELETE', headers: headers() }).then(handle),
  pillars: {
    list: (brandId) => fetch(`${BASE}/brands/${brandId}/pillars`, { headers: headers() }).then(handle),
    create: (brandId, data) => fetch(`${BASE}/brands/${brandId}/pillars`, { method: 'POST', headers: headers(), body: JSON.stringify(data) }).then(handle),
    update: (brandId, id, data) => fetch(`${BASE}/brands/${brandId}/pillars/${id}`, { method: 'PATCH', headers: headers(), body: JSON.stringify(data) }).then(handle),
    delete: (brandId, id) => fetch(`${BASE}/brands/${brandId}/pillars/${id}`, { method: 'DELETE', headers: headers() }).then(handle),
  }
};

// ─── PRODUCTION ───────────────────────────────────────────────────────────────
export const production = {
  assets: {
    list: (params = {}) => fetch(`${BASE}/production/assets?${new URLSearchParams(params)}`, { headers: headers() }).then(handle),
    create: (data) => fetch(`${BASE}/production/assets`, { method: 'POST', headers: headers(), body: JSON.stringify(data) }).then(handle),
    get: (id) => fetch(`${BASE}/production/assets/${id}`, { headers: headers() }).then(handle),
    update: (id, data) => fetch(`${BASE}/production/assets/${id}`, { method: 'PATCH', headers: headers(), body: JSON.stringify(data) }).then(handle),
    delete: (id) => fetch(`${BASE}/production/assets/${id}`, { method: 'DELETE', headers: headers() }).then(handle),
    logPerformance: (id, data) => fetch(`${BASE}/production/assets/${id}/performance`, { method: 'POST', headers: headers(), body: JSON.stringify(data) }).then(handle),
  },
  ideas: {
    list: (params = {}) => fetch(`${BASE}/production/ideas?${new URLSearchParams(params)}`, { headers: headers() }).then(handle),
    create: (data) => fetch(`${BASE}/production/ideas`, { method: 'POST', headers: headers(), body: JSON.stringify(data) }).then(handle),
    update: (id, data) => fetch(`${BASE}/production/ideas/${id}`, { method: 'PATCH', headers: headers(), body: JSON.stringify(data) }).then(handle),
    delete: (id) => fetch(`${BASE}/production/ideas/${id}`, { method: 'DELETE', headers: headers() }).then(handle),
  },
  hooks: {
    list: (params = {}) => fetch(`${BASE}/production/hooks?${new URLSearchParams(params)}`, { headers: headers() }).then(handle),
    create: (data) => fetch(`${BASE}/production/hooks`, { method: 'POST', headers: headers(), body: JSON.stringify(data) }).then(handle),
    update: (id, data) => fetch(`${BASE}/production/hooks/${id}`, { method: 'PATCH', headers: headers(), body: JSON.stringify(data) }).then(handle),
    delete: (id) => fetch(`${BASE}/production/hooks/${id}`, { method: 'DELETE', headers: headers() }).then(handle),
  },
};

// ─── DISTRIBUTION ─────────────────────────────────────────────────────────────
export const distribution = {
  funnels: {
    list: (brandId) => fetch(`${BASE}/distribution/funnels?brandId=${brandId}`, { headers: headers() }).then(handle),
    create: (data) => fetch(`${BASE}/distribution/funnels`, { method: 'POST', headers: headers(), body: JSON.stringify(data) }).then(handle),
    get: (id) => fetch(`${BASE}/distribution/funnels/${id}`, { headers: headers() }).then(handle),
    update: (id, data) => fetch(`${BASE}/distribution/funnels/${id}`, { method: 'PATCH', headers: headers(), body: JSON.stringify(data) }).then(handle),
    delete: (id) => fetch(`${BASE}/distribution/funnels/${id}`, { method: 'DELETE', headers: headers() }).then(handle),
  },
  ctaRoutes: {
    list: (params = {}) => fetch(`${BASE}/distribution/cta-routes?${new URLSearchParams(params)}`, { headers: headers() }).then(handle),
    create: (data) => fetch(`${BASE}/distribution/cta-routes`, { method: 'POST', headers: headers(), body: JSON.stringify(data) }).then(handle),
    update: (id, data) => fetch(`${BASE}/distribution/cta-routes/${id}`, { method: 'PATCH', headers: headers(), body: JSON.stringify(data) }).then(handle),
    delete: (id) => fetch(`${BASE}/distribution/cta-routes/${id}`, { method: 'DELETE', headers: headers() }).then(handle),
  },
  platformStats: {
    list: (brandId) => fetch(`${BASE}/distribution/platform-stats?brandId=${brandId}`, { headers: headers() }).then(handle),
    upsert: (data) => fetch(`${BASE}/distribution/platform-stats`, { method: 'POST', headers: headers(), body: JSON.stringify(data) }).then(handle),
    update: (id, data) => fetch(`${BASE}/distribution/platform-stats/${id}`, { method: 'PATCH', headers: headers(), body: JSON.stringify(data) }).then(handle),
  },
  orphanCheck: (brandId) => fetch(`${BASE}/distribution/orphan-check?brandId=${brandId}`, { headers: headers() }).then(handle),
};

// ─── BILLING ──────────────────────────────────────────────────────────────────
export const billing = {
  pricing: () => fetch(`${BASE}/billing/pricing`).then(handle),
  subscription: () => fetch(`${BASE}/billing/subscription`, { headers: headers() }).then(handle),
  history: () => fetch(`${BASE}/billing/history`, { headers: headers() }).then(handle),
  stripeCheckout: (tier, interval) =>
    fetch(`${BASE}/billing/stripe/checkout`, { method: 'POST', headers: headers(), body: JSON.stringify({ tier, interval }) }).then(handle),
  stripePortal: () =>
    fetch(`${BASE}/billing/stripe/portal`, { method: 'POST', headers: headers() }).then(handle),
  paypalCheckout: (tier, interval) =>
    fetch(`${BASE}/billing/paypal/checkout`, { method: 'POST', headers: headers(), body: JSON.stringify({ tier, interval }) }).then(handle),
  paypalActivate: (subscriptionId) =>
    fetch(`${BASE}/billing/paypal/activate`, { method: 'POST', headers: headers(), body: JSON.stringify({ subscriptionId }) }).then(handle),
  cancel: () =>
    fetch(`${BASE}/billing/cancel`, { method: 'POST', headers: headers() }).then(handle),
};
export const data = {
  analytics: (brandId, period = 30) => fetch(`${BASE}/data/analytics/${brandId}?period=${period}`, { headers: headers() }).then(handle),
  offers: {
    list: (brandId) => fetch(`${BASE}/data/offers?brandId=${brandId}`, { headers: headers() }).then(handle),
    create: (d) => fetch(`${BASE}/data/offers`, { method: 'POST', headers: headers(), body: JSON.stringify(d) }).then(handle),
    update: (id, d) => fetch(`${BASE}/data/offers/${id}`, { method: 'PATCH', headers: headers(), body: JSON.stringify(d) }).then(handle),
    delete: (id) => fetch(`${BASE}/data/offers/${id}`, { method: 'DELETE', headers: headers() }).then(handle),
  },
  campaigns: {
    list: (brandId, status) => fetch(`${BASE}/data/campaigns?brandId=${brandId}${status ? `&status=${status}` : ''}`, { headers: headers() }).then(handle),
    create: (d) => fetch(`${BASE}/data/campaigns`, { method: 'POST', headers: headers(), body: JSON.stringify(d) }).then(handle),
    update: (id, d) => fetch(`${BASE}/data/campaigns/${id}`, { method: 'PATCH', headers: headers(), body: JSON.stringify(d) }).then(handle),
  },
  reviews: {
    list: (brandId) => fetch(`${BASE}/data/reviews?brandId=${brandId}`, { headers: headers() }).then(handle),
    create: (d) => fetch(`${BASE}/data/reviews`, { method: 'POST', headers: headers(), body: JSON.stringify(d) }).then(handle),
    update: (id, d) => fetch(`${BASE}/data/reviews/${id}`, { method: 'PATCH', headers: headers(), body: JSON.stringify(d) }).then(handle),
  },
  reseed: () => fetch(`${BASE}/data/reseed`, { method: 'POST', headers: headers() }).then(handle),
};

export const deals = {
  list: (brandId) => fetch(`${BASE}/data/deals${brandId ? `?brandId=${brandId}` : ''}`, { headers: headers() }).then(handle),
  create: (d) => fetch(`${BASE}/data/deals`, { method: 'POST', headers: headers(), body: JSON.stringify(d) }).then(handle),
  update: (id, d) => fetch(`${BASE}/data/deals/${id}`, { method: 'PATCH', headers: headers(), body: JSON.stringify(d) }).then(handle),
  delete: (id) => fetch(`${BASE}/data/deals/${id}`, { method: 'DELETE', headers: headers() }).then(handle),
};

export const repurposed = {
  list: (brandId, status) => fetch(`${BASE}/production/repurposed${brandId ? `?brandId=${brandId}${status ? `&status=${status}` : ''}` : ''}`, { headers: headers() }).then(handle),
  create: (assetId, d) => fetch(`${BASE}/production/assets/${assetId}/repurposed`, { method: 'POST', headers: headers(), body: JSON.stringify(d) }).then(handle),
  update: (id, d) => fetch(`${BASE}/production/repurposed/${id}`, { method: 'PATCH', headers: headers(), body: JSON.stringify(d) }).then(handle),
  delete: (id) => fetch(`${BASE}/production/repurposed/${id}`, { method: 'DELETE', headers: headers() }).then(handle),
};

export const scheduler = {
  // Platform connections
  platforms: {
    list: () =>
      fetch(`${BASE}/scheduler/platforms`, { headers: headers() }).then(handle),
    connect: (platform, data) =>
      fetch(`${BASE}/scheduler/platforms/connect`, { method: 'POST', headers: headers(), body: JSON.stringify({ platform, ...data }) }).then(handle),
    disconnect: (platform) =>
      fetch(`${BASE}/scheduler/platforms/${platform}`, { method: 'DELETE', headers: headers() }).then(handle),
    disconnectById: (id) =>
      fetch(`${BASE}/scheduler/platforms/conn/${id}`, { method: 'DELETE', headers: headers() }).then(handle),
    getOAuthUrl: (platform) =>
      fetch(`${BASE}/scheduler/oauth/${platform}`, { headers: headers() }).then(handle),
  },
  // Scheduled posts
  posts: {
    list: (brandId, status) =>
      fetch(`${BASE}/scheduler/posts?brandId=${brandId}${status ? `&status=${status}` : ''}`, { headers: headers() }).then(handle),
    create: (d) =>
      fetch(`${BASE}/scheduler/posts`, { method: 'POST', headers: headers(), body: JSON.stringify(d) }).then(handle),
    update: (id, d) =>
      fetch(`${BASE}/scheduler/posts/${id}`, { method: 'PATCH', headers: headers(), body: JSON.stringify(d) }).then(handle),
    delete: (id) =>
      fetch(`${BASE}/scheduler/posts/${id}`, { method: 'DELETE', headers: headers() }).then(handle),
    publishNow: (id) =>
      fetch(`${BASE}/scheduler/posts/${id}/publish`, { method: 'POST', headers: headers() }).then(handle),
  },
  // Auto-workflows
  workflows: {
    list: () =>
      fetch(`${BASE}/scheduler/workflows`, { headers: headers() }).then(handle),
    create: (d) =>
      fetch(`${BASE}/scheduler/workflows`, { method: 'POST', headers: headers(), body: JSON.stringify(d) }).then(handle),
    update: (id, d) =>
      fetch(`${BASE}/scheduler/workflows/${id}`, { method: 'PATCH', headers: headers(), body: JSON.stringify(d) }).then(handle),
    delete: (id) =>
      fetch(`${BASE}/scheduler/workflows/${id}`, { method: 'DELETE', headers: headers() }).then(handle),
  },
  // Publish log
  log: (brandId) =>
    fetch(`${BASE}/scheduler/log${brandId ? `?brandId=${brandId}` : ''}`, { headers: headers() }).then(handle),
  // Repurpose rules (auto-distribution engine)
  repurposeRules: {
    list: () =>
      fetch(`${BASE}/scheduler/repurpose-rules`, { headers: headers() }).then(handle),
    create: (d) =>
      fetch(`${BASE}/scheduler/repurpose-rules`, { method: 'POST', headers: headers(), body: JSON.stringify(d) }).then(handle),
    update: (id, d) =>
      fetch(`${BASE}/scheduler/repurpose-rules/${id}`, { method: 'PATCH', headers: headers(), body: JSON.stringify(d) }).then(handle),
    delete: (id) =>
      fetch(`${BASE}/scheduler/repurpose-rules/${id}`, { method: 'DELETE', headers: headers() }).then(handle),
  },
};

// ─── CHANNEL DOWNLOADER ───────────────────────────────────────────────────────
// Bulk batch downloader with a persisted job queue (server/routes/channelDownloader.js).
export const channelDownloader = {
  start: (opts) => fetch(`${BASE}/channel-downloader/start`, { method: 'POST', headers: headers(), body: JSON.stringify(opts) }).then(handle),
  status: (jobId) => fetch(`${BASE}/channel-downloader/status/${jobId}`, { headers: headers() }).then(handle),
  cancel: (jobId) => fetch(`${BASE}/channel-downloader/cancel/${jobId}`, { method: 'POST', headers: headers() }).then(handle),
  // Resume a failed/cancelled/incomplete job — the server re-runs it against the
  // same download archive, so only videos that never finished get re-fetched.
  resume: (jobId) => fetch(`${BASE}/channel-downloader/resume/${jobId}`, { method: 'POST', headers: headers() }).then(handle),
  jobs: () => fetch(`${BASE}/channel-downloader/jobs`, { headers: headers() }).then(handle),
  files: (jobId) => fetch(`${BASE}/channel-downloader/files/${jobId}`, { headers: headers() }).then(handle),
  analysis: (jobId) => fetch(`${BASE}/channel-downloader/analysis/${jobId}`, { headers: headers() }).then(handle),
  analyze: (jobId) => fetch(`${BASE}/channel-downloader/analyze/${jobId}`, { method: 'POST', headers: headers() }).then(handle),
  cleanup: (jobId) => fetch(`${BASE}/channel-downloader/cleanup/${jobId}`, { method: 'POST', headers: headers() }).then(handle),
  remove: (jobId) => fetch(`${BASE}/channel-downloader/job/${jobId}`, { method: 'DELETE', headers: headers() }).then(handle),
  storageStats: () => fetch(`${BASE}/channel-downloader/storage-stats`, { headers: headers() }).then(handle),
  // Direct link for pulling a completed file to the user's machine (server streams it as an attachment).
  fileUrl: (jobId, filename) => `${BASE}/channel-downloader/download/${jobId}/${encodeURIComponent(filename)}`,
};

// ─── VIDEO DOWNLOADER ─────────────────────────────────────────────────────────
// Single-video by-URL downloader (server/routes/videoDownloader.js).
export const videoDownloader = {
  info: (url) => fetch(`${BASE}/video-downloader/info`, { method: 'POST', headers: headers(), body: JSON.stringify({ url }) }).then(handle),
  // /download streams the media file back — return the raw Response so callers can blob() it.
  download: async ({ url, quality = 'best', audioOnly = false }) => {
    const res = await fetch(`${BASE}/video-downloader/download`, { method: 'POST', headers: headers(), body: JSON.stringify({ url, quality, audioOnly }) });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw Object.assign(new Error(err.error || `HTTP ${res.status}`), err, { status: res.status });
    }
    return res; // caller does res.blob() + Content-Disposition parsing
  },
};

// ─── SMART CLIPPER ────────────────────────────────────────────────────────────
// Upload-only: user uploads a long-form video file they already have; the server
// detects highlight moments and cuts individual clips (server/routes/clipper.js).
// No URL input exists in this module.
export const smartClipper = {
  health: () => fetch(`${BASE}/smart-clipper/health`, { headers: headers() }).then(handle),
  // Multipart upload — do NOT set Content-Type; the browser adds the multipart boundary.
  // onProgress(0..100) is optional and driven via XHR so the upload bar can move.
  uploadAndClip: ({ file, contentPillars = '', niche = '', clipCount = 5, maxDuration = 60, captionStyle = 'bold', onProgress }) =>
    new Promise((resolve, reject) => {
      const form = new FormData();
      form.append('video', file);
      form.append('contentPillars', contentPillars);
      form.append('niche', niche);
      form.append('clipCount', String(clipCount));
      form.append('maxDuration', String(maxDuration));
      form.append('captionStyle', captionStyle);
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${BASE}/smart-clipper/clip-upload`);
      const token = getToken();
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      if (onProgress) xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
      xhr.onload = () => {
        let data = {};
        try { data = JSON.parse(xhr.responseText); } catch {}
        if (xhr.status >= 200 && xhr.status < 300) resolve(data);
        else reject(Object.assign(new Error(data.error || `HTTP ${xhr.status}`), data, { status: xhr.status }));
      };
      xhr.onerror = () => reject(new Error('Upload failed — network error'));
      xhr.send(form);
    }),
  status: (jobId) => fetch(`${BASE}/smart-clipper/status/${jobId}`, { headers: headers() }).then(handle),
  remove: (jobId) => fetch(`${BASE}/smart-clipper/job/${jobId}`, { method: 'DELETE', headers: headers() }).then(handle),
  // The preview/download routes require the Bearer token, but a native <video src>
  // or <a href download> can't send an Authorization header (the JWT lives in
  // localStorage, not a cookie) — so those requests 401. Fetch the bytes WITH the
  // auth header instead and hand back a blob object URL. Callers must revoke it.
  fetchClipObjectUrl: async (jobId, filename) => {
    const res = await fetch(`${BASE}/smart-clipper/preview/${jobId}/${encodeURIComponent(filename)}`,
      { headers: { Authorization: `Bearer ${getToken()}` } });
    if (!res.ok) throw Object.assign(new Error(`Preview failed (HTTP ${res.status})`), { status: res.status });
    return URL.createObjectURL(await res.blob());
  },
  downloadClip: async (jobId, filename, saveAs) => {
    const res = await fetch(`${BASE}/smart-clipper/download/${jobId}/${encodeURIComponent(filename)}`,
      { headers: { Authorization: `Bearer ${getToken()}` } });
    if (!res.ok) throw Object.assign(new Error(`Download failed (HTTP ${res.status})`), { status: res.status });
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement('a');
    a.href = url;
    a.download = saveAs || filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};
