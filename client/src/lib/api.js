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
