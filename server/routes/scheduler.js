// server/routes/scheduler.js
// Scheduler & Distributor — Phase 2
// Handles: scheduled posts, platform connections, OAuth, auto-workflows, publish log

const express = require('express');
const router = express.Router();
const { v4: uuid } = require('uuid');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getDB } = require('../db');
const { authenticate } = require('../middleware/auth');
const { requireSubscription, isAdmin } = require('../middleware/subscription');
const { publishPost } = require('../scheduler/publish');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Strip stray quotes that Railway/some deployment UIs add around env var values
// e.g. YOUTUBE_CLIENT_ID="\"abc\"" → "abc"
[
  'YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET',
  'INSTAGRAM_APP_ID', 'INSTAGRAM_APP_SECRET',
  'FACEBOOK_APP_ID',  'FACEBOOK_APP_SECRET',
  'LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET',
  'TIKTOK_CLIENT_KEY',  'TIKTOK_CLIENT_SECRET',
  'TWITTER_CLIENT_ID',  'TWITTER_CLIENT_SECRET',
  'PINTEREST_APP_ID',   'PINTEREST_APP_SECRET',
].forEach(key => {
  if (process.env[key]) {
    process.env[key] = process.env[key].replace(/^["']+|["']+$/g, '').trim();
  }
});

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function upsertConnection(db, userId, platform, handle, accessToken, refreshToken, tokenExpires) {
  const admin = isAdmin(userId);
  const h = handle || '';

  if (admin) {
    // Admin: match by (user, platform, handle) — allows multiple accounts per platform
    const existing = db.prepare(
      'SELECT id FROM platform_connections WHERE user_id = ? AND platform = ? AND handle = ?'
    ).get(userId, platform, h);
    if (existing) {
      db.prepare(`UPDATE platform_connections SET access_token=?, refresh_token=?, token_expires=?, connected=1, updated_at=datetime('now') WHERE id=?`)
        .run(accessToken || '', refreshToken || '', tokenExpires || null, existing.id);
    } else {
      db.prepare(`INSERT INTO platform_connections (id, user_id, platform, handle, access_token, refresh_token, token_expires, connected) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`)
        .run(uuid(), userId, platform, h, accessToken || '', refreshToken || '', tokenExpires || null);
    }
  } else {
    // Regular user: one connection per platform — always upsert by (user, platform)
    const existing = db.prepare(
      'SELECT id FROM platform_connections WHERE user_id = ? AND platform = ?'
    ).get(userId, platform);
    if (existing) {
      db.prepare(`UPDATE platform_connections SET handle=?, access_token=?, refresh_token=?, token_expires=?, connected=1, updated_at=datetime('now') WHERE id=?`)
        .run(h, accessToken || '', refreshToken || '', tokenExpires || null, existing.id);
    } else {
      db.prepare(`INSERT INTO platform_connections (id, user_id, platform, handle, access_token, refresh_token, token_expires, connected) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`)
        .run(uuid(), userId, platform, h, accessToken || '', refreshToken || '', tokenExpires || null);
    }
  }
}

// ─── PLATFORM CONNECTIONS ─────────────────────────────────────────────────────

// GET /api/scheduler/platforms — list connected platforms for user
router.get('/platforms', authenticate, (req, res) => {
  const db = getDB();
  const platforms = db.prepare(`
    SELECT * FROM platform_connections WHERE user_id = ? ORDER BY created_at ASC
  `).all(req.userId);
  res.json(platforms);
});

// POST /api/scheduler/platforms/connect — store a platform connection
// Admin: inserts a new row per handle (multi-account). Regular: one per platform.
router.post('/platforms/connect', authenticate, (req, res) => {
  const { platform, handle, access_token, refresh_token } = req.body;
  if (!platform) return res.status(400).json({ error: 'platform required' });

  const SUPPORTED = ['youtube', 'instagram', 'facebook', 'linkedin'];
  if (!SUPPORTED.includes(platform)) {
    return res.status(400).json({ error: `${platform} not yet supported. Coming soon.` });
  }

  const db = getDB();
  upsertConnection(db, req.userId, platform, handle, access_token, refresh_token, null);
  res.json({ success: true, platform, connected: true });
});

// DELETE /api/scheduler/platforms/:platform — disconnect all accounts for a platform (regular users)
router.delete('/platforms/:platform', authenticate, (req, res) => {
  const db = getDB();
  db.prepare(
    `UPDATE platform_connections SET connected = 0, access_token = '', refresh_token = '', updated_at = datetime('now') WHERE user_id = ? AND platform = ?`
  ).run(req.userId, req.params.platform);
  res.json({ success: true });
});

// DELETE /api/scheduler/platforms/conn/:id — disconnect a specific account by row ID (admin multi-account)
router.delete('/platforms/conn/:id', authenticate, (req, res) => {
  const db = getDB();
  // Only the owner can disconnect their own connection
  const conn = db.prepare('SELECT id FROM platform_connections WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!conn) return res.status(404).json({ error: 'Connection not found' });
  db.prepare(
    `UPDATE platform_connections SET connected = 0, access_token = '', refresh_token = '', updated_at = datetime('now') WHERE id = ?`
  ).run(req.params.id);
  res.json({ success: true });
});

// ─── OAUTH FLOW (Phase 1 — YouTube + Meta) ───────────────────────────────────

// Credentials required for each platform OAuth
const PLATFORM_CREDS = {
  youtube:   () => process.env.YOUTUBE_CLIENT_ID && process.env.YOUTUBE_CLIENT_SECRET,
  instagram: () => (process.env.FACEBOOK_APP_ID || process.env.INSTAGRAM_APP_ID) && (process.env.FACEBOOK_APP_SECRET || process.env.INSTAGRAM_APP_SECRET),
  facebook:  () => process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET,
  linkedin:  () => process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET,
  tiktok:    () => process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET,
  twitter:   () => process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_SECRET,
  threads:   () => process.env.INSTAGRAM_APP_ID && process.env.INSTAGRAM_APP_SECRET, // reuses Meta app
  pinterest: () => process.env.PINTEREST_APP_ID && process.env.PINTEREST_APP_SECRET,
};

const PLATFORM_SETUP_URLS = {
  youtube:   'https://console.cloud.google.com/apis/credentials',
  instagram: 'https://developers.facebook.com/apps',
  facebook:  'https://developers.facebook.com/apps',
  linkedin:  'https://www.linkedin.com/developers/apps',
  tiktok:    'https://developers.tiktok.com',
  twitter:   'https://developer.twitter.com/en/portal/dashboard',
  threads:   'https://developers.facebook.com/apps',
  pinterest: 'https://developers.pinterest.com/apps',
};

// GET /api/scheduler/oauth/:platform — get OAuth URL (JWT-signed state)
router.get('/oauth/:platform', authenticate, (req, res) => {
  const { platform } = req.params;

  // Check credentials are configured before building OAuth URL
  const hasCredentials = PLATFORM_CREDS[platform];
  if (!hasCredentials) return res.status(400).json({ error: 'Platform not supported yet' });
  if (!hasCredentials()) {
    return res.status(422).json({
      error: 'oauth_not_configured',
      message: `${platform} OAuth credentials are not set in .env. Add ${platform.toUpperCase()}_CLIENT_ID / SECRET and restart the server.`,
      setup_url: PLATFORM_SETUP_URLS[platform] || null,
      use_manual: true,
    });
  }

  const redirectUri = `${SERVER_URL}/api/scheduler/oauth/${platform}/callback`;
  // Sign state with JWT so callback can verify it and recover userId
  const state = jwt.sign({ userId: req.userId }, JWT_SECRET, { expiresIn: '10m' });

  // For Twitter, generate PKCE and embed verifier in state
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  const twitterState = jwt.sign({ userId: req.userId, cv: codeVerifier }, JWT_SECRET, { expiresIn: '10m' });

  const oauthUrls = {
    youtube: `https://accounts.google.com/o/oauth2/v2/auth?` + new URLSearchParams({
      client_id: process.env.YOUTUBE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube',
      access_type: 'offline',
      prompt: 'consent',
      state,
    }),
    // Instagram Graph API auth goes through Facebook Login using the SAME Facebook app.
    // Uses FACEBOOK_APP_ID (falls back to INSTAGRAM_APP_ID for legacy configs).
    instagram: `https://www.facebook.com/v21.0/dialog/oauth?` + new URLSearchParams({
      client_id: process.env.FACEBOOK_APP_ID || process.env.INSTAGRAM_APP_ID,
      redirect_uri: redirectUri,
      scope: 'instagram_basic,instagram_content_publish,pages_show_list,pages_manage_posts',
      response_type: 'code',
      state,
    }),
    facebook: `https://www.facebook.com/v21.0/dialog/oauth?` + new URLSearchParams({
      client_id: process.env.FACEBOOK_APP_ID,
      redirect_uri: redirectUri,
      // pages_show_list — required to list managed pages in /me/accounts callback
      // pages_manage_posts — publish text/link posts to page feed
      // pages_read_engagement — read page metrics
      // pages_manage_metadata — needed for video upload session on graph-video.facebook.com
      scope: 'pages_show_list,pages_manage_posts,pages_read_engagement,pages_manage_metadata',
      response_type: 'code',
      state,
    }),
    linkedin: `https://www.linkedin.com/oauth/v2/authorization?` + new URLSearchParams({
      response_type: 'code',
      client_id: process.env.LINKEDIN_CLIENT_ID,
      redirect_uri: redirectUri,
      scope: 'w_member_social r_liteprofile',
      state,
    }),
    tiktok: `https://www.tiktok.com/v2/auth/authorize/?` + new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'user.info.basic,video.publish,video.upload',
      state,
    }),
    twitter: `https://twitter.com/i/oauth2/authorize?` + new URLSearchParams({
      response_type: 'code',
      client_id: process.env.TWITTER_CLIENT_ID,
      redirect_uri: redirectUri,
      scope: 'tweet.read tweet.write users.read offline.access',
      state: twitterState,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    }),
    threads: `https://threads.net/oauth/authorize?` + new URLSearchParams({
      client_id: process.env.INSTAGRAM_APP_ID,
      redirect_uri: redirectUri,
      scope: 'threads_basic,threads_content_publish',
      response_type: 'code',
      state,
    }),
    pinterest: `https://www.pinterest.com/oauth/?` + new URLSearchParams({
      client_id: process.env.PINTEREST_APP_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'boards:read,pins:read,pins:write',
      state,
    }),
  };

  const url = oauthUrls[platform];
  if (!url) return res.status(400).json({ error: 'Platform not supported yet' });
  res.json({ oauth_url: url, platform });
});

// GET /api/scheduler/oauth/:platform/callback — full token exchange
// NOTE: This route does NOT use the router-level authenticate middleware
// because the request comes from the platform (no Bearer token).
// Authentication is done via the JWT state parameter.
router.get('/oauth/:platform/callback', async (req, res) => {
  const { platform } = req.params;
  const { code, state, error } = req.query;

  if (error) {
    console.error(`[OAuth] ${platform} error:`, error);
    return res.redirect(`${CLIENT_URL}/oauth-callback.html?status=error&platform=${platform}&reason=${encodeURIComponent(error)}`);
  }

  // Verify state JWT to recover userId
  let userId;
  try {
    const decoded = jwt.verify(state, JWT_SECRET);
    userId = decoded.userId;
  } catch (err) {
    console.error('[OAuth] Invalid state JWT:', err.message);
    return res.redirect(`${CLIENT_URL}/oauth-callback.html?status=error&platform=${platform}&reason=state_invalid`);
  }

  const db = getDB();
  const redirectUri = `${SERVER_URL}/api/scheduler/oauth/${platform}/callback`;

  try {
    if (platform === 'youtube') {
      // Exchange code for tokens
      const tokenResp = await axios.post('https://oauth2.googleapis.com/token', {
        code,
        client_id: process.env.YOUTUBE_CLIENT_ID,
        client_secret: process.env.YOUTUBE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      });
      const { access_token, refresh_token, expires_in } = tokenResp.data;
      // Get channel info
      const channelResp = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
        params: { part: 'snippet', mine: true },
        headers: { Authorization: `Bearer ${access_token}` },
      });
      const channelName = channelResp.data.items?.[0]?.snippet?.title || 'YouTube Channel';
      const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();
      upsertConnection(db, userId, 'youtube', channelName, access_token, refresh_token || '', expiresAt);

    } else if (platform === 'facebook') {
      // Exchange code for user access token (v21.0)
      const tokenResp = await axios.get('https://graph.facebook.com/v21.0/oauth/access_token', {
        params: { client_id: process.env.FACEBOOK_APP_ID, client_secret: process.env.FACEBOOK_APP_SECRET, redirect_uri: redirectUri, code },
      });
      const userToken = tokenResp.data.access_token;
      // Get managed pages — page access token is long-lived by default
      const pagesResp = await axios.get('https://graph.facebook.com/v21.0/me/accounts', {
        params: { access_token: userToken },
      });
      const page = pagesResp.data.data?.[0];
      if (!page) throw new Error('No Facebook Pages found. Create a Page to connect.');
      // Store page ID as handle — publishToFacebook uses /{page-id}/videos and /{page-id}/feed
      upsertConnection(db, userId, 'facebook', page.id, page.access_token, '', null);

    } else if (platform === 'instagram') {
      // Instagram Graph API: auth via Facebook Login → get page access token → get IG Business Account ID
      // Uses FACEBOOK_APP_ID/SECRET (same app as Facebook — Instagram Graph API is part of the same Meta app).
      const tokenResp = await axios.get('https://graph.facebook.com/v21.0/oauth/access_token', {
        params: {
          client_id: process.env.FACEBOOK_APP_ID || process.env.INSTAGRAM_APP_ID,
          client_secret: process.env.FACEBOOK_APP_SECRET || process.env.INSTAGRAM_APP_SECRET,
          redirect_uri: redirectUri,
          code,
        },
      });
      const userToken = tokenResp.data.access_token;

      // Get Facebook Pages managed by the user (each page has its own access token)
      const pagesResp = await axios.get('https://graph.facebook.com/v21.0/me/accounts', {
        params: { access_token: userToken },
      });
      const pages = pagesResp.data.data || [];
      if (!pages.length) throw new Error('No Facebook Pages found. Connect your Instagram Business account to a Facebook Page first.');

      // Find the first page with a connected Instagram Business/Creator account
      let igAccountId = null;
      let pageAccessToken = null;
      for (const page of pages) {
        const igResp = await axios.get(`https://graph.facebook.com/v21.0/${page.id}`, {
          params: { fields: 'instagram_business_account', access_token: page.access_token },
        });
        if (igResp.data.instagram_business_account?.id) {
          igAccountId = igResp.data.instagram_business_account.id;
          pageAccessToken = page.access_token;
          break;
        }
      }
      if (!igAccountId) throw new Error('No Instagram Business/Creator account found. Convert your Instagram to Business or Creator and connect it to a Facebook Page.');

      // conn.handle = numeric IG Business Account ID — publishToInstagram calls /{igAccountId}/media
      // conn.access_token = page access token (long-lived, required by Graph API)
      upsertConnection(db, userId, 'instagram', igAccountId, pageAccessToken, '', null);

    } else if (platform === 'linkedin') {
      // Exchange code for access token
      const tokenResp = await axios.post('https://www.linkedin.com/oauth/v2/accessToken',
        new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri, client_id: process.env.LINKEDIN_CLIENT_ID, client_secret: process.env.LINKEDIN_CLIENT_SECRET }).toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      const { access_token, expires_in } = tokenResp.data;
      // Get member URN
      const meResp = await axios.get('https://api.linkedin.com/v2/me', {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      const memberId = meResp.data.id;
      const handle = `urn:li:person:${memberId}`;
      const expiresAt = new Date(Date.now() + (expires_in || 5184000) * 1000).toISOString();
      upsertConnection(db, userId, 'linkedin', handle, access_token, '', expiresAt);

    } else if (platform === 'tiktok') {
      const tokenResp = await axios.post('https://open.tiktokapis.com/v2/oauth/token/', new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY,
        client_secret: process.env.TIKTOK_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }).toString(), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
      const { access_token, refresh_token, expires_in, open_id } = tokenResp.data;
      const expiresAt = new Date(Date.now() + (expires_in || 86400) * 1000).toISOString();
      // Get user info
      const userResp = await axios.get('https://open.tiktokapis.com/v2/user/info/', {
        params: { fields: 'display_name,username' },
        headers: { Authorization: `Bearer ${access_token}` },
      });
      const handle = userResp.data?.data?.user?.display_name || userResp.data?.data?.user?.username || open_id || 'TikTok User';
      upsertConnection(db, userId, 'tiktok', handle, access_token, refresh_token || '', expiresAt);

    } else if (platform === 'twitter') {
      // Extract PKCE code_verifier from JWT state
      let codeVerifier = '';
      try {
        const decoded = jwt.verify(state, JWT_SECRET);
        codeVerifier = decoded.cv || '';
      } catch(e) { throw new Error('Invalid Twitter OAuth state'); }
      const credentials = Buffer.from(`${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`).toString('base64');
      const tokenResp = await axios.post('https://api.twitter.com/2/oauth2/token', new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }).toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${credentials}` },
      });
      const { access_token, refresh_token, expires_in } = tokenResp.data;
      const expiresAt = expires_in ? new Date(Date.now() + expires_in * 1000).toISOString() : null;
      const meResp = await axios.get('https://api.twitter.com/2/users/me', {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      const handle = '@' + (meResp.data?.data?.username || 'twitter_user');
      upsertConnection(db, userId, 'twitter', handle, access_token, refresh_token || '', expiresAt);

    } else if (platform === 'threads') {
      // Short-lived token exchange (same as Instagram but threads endpoint)
      const formData = new URLSearchParams({
        client_id: process.env.INSTAGRAM_APP_ID,
        client_secret: process.env.INSTAGRAM_APP_SECRET,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code,
      });
      const shortResp = await axios.post('https://graph.threads.net/oauth/access_token', formData.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      const shortToken = shortResp.data.access_token;
      // Exchange for long-lived token
      const longResp = await axios.get('https://graph.threads.net/access_token', {
        params: { grant_type: 'th_exchange_token', client_secret: process.env.INSTAGRAM_APP_SECRET, access_token: shortToken },
      });
      const longToken = longResp.data.access_token;
      const expiresAt = new Date(Date.now() + (longResp.data.expires_in || 5184000) * 1000).toISOString();
      const meResp = await axios.get('https://graph.threads.net/v1.0/me', {
        params: { fields: 'id,username', access_token: longToken },
      });
      // Store numeric Threads user ID in handle — publishToThreads calls /{threadsUserId}/threads
      const threadsUserId = String(meResp.data.id || shortResp.data.user_id || 'threads_user');
      upsertConnection(db, userId, 'threads', threadsUserId, longToken, '', expiresAt);

    } else if (platform === 'pinterest') {
      const credentials = Buffer.from(`${process.env.PINTEREST_APP_ID}:${process.env.PINTEREST_APP_SECRET}`).toString('base64');
      const tokenResp = await axios.post('https://api.pinterest.com/v5/oauth/token', new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }).toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${credentials}` },
      });
      const { access_token, refresh_token, expires_in } = tokenResp.data;
      const expiresAt = expires_in ? new Date(Date.now() + expires_in * 1000).toISOString() : null;
      const meResp = await axios.get('https://api.pinterest.com/v5/user_account', {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      const handle = meResp.data?.username || 'pinterest_user';
      upsertConnection(db, userId, 'pinterest', handle, access_token, refresh_token || '', expiresAt);

    } else {
      throw new Error(`Platform ${platform} not yet supported`);
    }

    console.log(`[OAuth] ${platform} connected for user ${userId}`);
    res.redirect(`${CLIENT_URL}/oauth-callback.html?status=success&platform=${platform}`);

  } catch (err) {
    const reason = encodeURIComponent(err.response?.data?.error_description || err.message || 'unknown');
    console.error(`[OAuth] ${platform} token exchange failed:`, err.response?.data || err.message);
    res.redirect(`${CLIENT_URL}/oauth-callback.html?status=error&platform=${platform}&reason=${reason}`);
  }
});

// All routes below require auth — the callback above is intentionally exempt
// (it's called by the platform redirect, not by our frontend with a Bearer token;
// authentication is done via the JWT state parameter instead)
router.use(authenticate);
// Note: requireSubscription is applied per-route below.
// Platform connections and OAuth URL generation are free — scheduling posts is a paid feature.

// ─── SCHEDULED POSTS ─────────────────────────────────────────────────────────
// Subscription required from here down (creating & publishing posts is a paid feature)

// GET /api/scheduler/posts — list all scheduled posts for brand
router.get('/posts', requireSubscription, (req, res) => {
  const { brandId, status } = req.query;
  if (!brandId) return res.status(400).json({ error: 'brandId required' });

  const db = getDB();
  let query = 'SELECT * FROM scheduled_posts WHERE user_id = ? AND brand_id = ?';
  const params = [req.userId, brandId];

  if (status) { query += ' AND status = ?'; params.push(status); }
  query += ' ORDER BY scheduled_at ASC';

  const posts = db.prepare(query).all(...params);
  // Parse JSON destinations
  return res.json(posts.map(p => ({
    ...p,
    destinations: JSON.parse(p.destinations || '[]'),
    media_urls: JSON.parse(p.media_urls || '[]'),
  })));
});

// POST /api/scheduler/posts — create a scheduled post
router.post('/posts', requireSubscription, (req, res) => {
  const { brand_id, title, caption, format, destinations, scheduled_at, media_urls } = req.body;
  if (!brand_id || !title || !destinations?.length || !scheduled_at) {
    return res.status(400).json({ error: 'brand_id, title, destinations and scheduled_at required' });
  }

  const db = getDB();
  const id = uuid();
  db.prepare(`
    INSERT INTO scheduled_posts
      (id, user_id, brand_id, title, caption, format, destinations, scheduled_at, media_urls, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'queued', datetime('now'), datetime('now'))
  `).run(
    id, req.userId, brand_id, title,
    caption || '', format || 'Short Form Video',
    JSON.stringify(destinations),
    scheduled_at,
    JSON.stringify(media_urls || [])
  );

  const post = db.prepare('SELECT * FROM scheduled_posts WHERE id = ?').get(id);
  res.status(201).json({
    ...post,
    destinations: JSON.parse(post.destinations),
    media_urls: JSON.parse(post.media_urls || '[]'),
  });
});

// PATCH /api/scheduler/posts/:id — update a scheduled post
router.patch('/posts/:id', requireSubscription, (req, res) => {
  const { title, caption, destinations, scheduled_at, status } = req.body;
  const db = getDB();
  const post = db.prepare(
    'SELECT id FROM scheduled_posts WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.userId);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const updates = [];
  const params = [];
  if (title)        { updates.push('title = ?');        params.push(title); }
  if (caption)      { updates.push('caption = ?');      params.push(caption); }
  if (destinations) { updates.push('destinations = ?'); params.push(JSON.stringify(destinations)); }
  if (scheduled_at) { updates.push('scheduled_at = ?'); params.push(scheduled_at); }
  if (status)       { updates.push('status = ?');       params.push(status); }

  if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });

  updates.push("updated_at = datetime('now')");
  params.push(req.params.id, req.userId);

  db.prepare(`UPDATE scheduled_posts SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...params);
  const updated = db.prepare('SELECT * FROM scheduled_posts WHERE id = ?').get(req.params.id);
  res.json({ ...updated, destinations: JSON.parse(updated.destinations || '[]') });
});

// DELETE /api/scheduler/posts/:id — delete a scheduled post
router.delete('/posts/:id', requireSubscription, (req, res) => {
  const db = getDB();
  db.prepare('DELETE FROM scheduled_posts WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ success: true });
});

// POST /api/scheduler/posts/:id/publish — publish immediately
router.post('/posts/:id/publish', requireSubscription, async (req, res) => {
  const db = getDB();
  const post = db.prepare(
    'SELECT * FROM scheduled_posts WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.userId);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  try {
    db.prepare("UPDATE scheduled_posts SET status = 'publishing', updated_at = datetime('now') WHERE id = ?").run(post.id);
    const { results, status } = await publishPost(post, req.userId);
    res.json({ success: true, results, status });
  } catch (err) {
    db.prepare("UPDATE scheduled_posts SET status = 'failed', error_log = ?, updated_at = datetime('now') WHERE id = ?").run(err.message, post.id);
    res.status(500).json({ error: 'Publish failed', details: err.message });
  }
});

// ─── AUTO-WORKFLOWS ───────────────────────────────────────────────────────────

// GET /api/scheduler/workflows
router.get('/workflows', requireSubscription, (req, res) => {
  const db = getDB();
  const workflows = db.prepare(
    'SELECT * FROM distribution_workflows WHERE user_id = ? ORDER BY created_at DESC'
  ).all(req.userId);
  res.json(workflows.map(w => ({
    ...w,
    destinations: JSON.parse(w.destinations || '[]'),
  })));
});

// POST /api/scheduler/workflows
router.post('/workflows', requireSubscription, (req, res) => {
  const { brand_id, source_platform, destinations, label } = req.body;
  if (!source_platform || !destinations?.length) {
    return res.status(400).json({ error: 'source_platform and destinations required' });
  }
  const db = getDB();
  const id = uuid();
  db.prepare(`
    INSERT INTO distribution_workflows
      (id, user_id, brand_id, source_platform, destinations, label, active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
  `).run(id, req.userId, brand_id || null, source_platform, JSON.stringify(destinations), label || `${source_platform} → auto`);

  const w = db.prepare('SELECT * FROM distribution_workflows WHERE id = ?').get(id);
  res.status(201).json({ ...w, destinations: JSON.parse(w.destinations) });
});

// PATCH /api/scheduler/workflows/:id
router.patch('/workflows/:id', requireSubscription, (req, res) => {
  const { active, destinations, label } = req.body;
  const db = getDB();
  const updates = ["updated_at = datetime('now')"];
  const params = [];
  if (active !== undefined) { updates.push('active = ?'); params.push(active ? 1 : 0); }
  if (destinations)         { updates.push('destinations = ?'); params.push(JSON.stringify(destinations)); }
  if (label)                { updates.push('label = ?'); params.push(label); }
  params.push(req.params.id, req.userId);
  db.prepare(`UPDATE distribution_workflows SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...params);
  const w = db.prepare('SELECT * FROM distribution_workflows WHERE id = ?').get(req.params.id);
  res.json({ ...w, destinations: JSON.parse(w.destinations || '[]') });
});

// DELETE /api/scheduler/workflows/:id
router.delete('/workflows/:id', requireSubscription, (req, res) => {
  const db = getDB();
  db.prepare('DELETE FROM distribution_workflows WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ success: true });
});

// ─── PUBLISH LOG ─────────────────────────────────────────────────────────────

// GET /api/scheduler/log — recent publish activity
router.get('/log', (req, res) => {
  const { brandId } = req.query;
  const db = getDB();
  const log = db.prepare(`
    SELECT * FROM publish_log WHERE user_id = ?
    ${brandId ? 'AND brand_id = ?' : ''}
    ORDER BY published_at DESC LIMIT 50
  `).all(...[req.userId, brandId].filter(Boolean));
  res.json(log);
});

// ─── REPURPOSE RULES ──────────────────────────────────────────────────────────

// GET /api/scheduler/repurpose-rules
router.get('/repurpose-rules', requireSubscription, (req, res) => {
  const db = getDB();
  const rules = db.prepare(
    'SELECT * FROM repurpose_rules WHERE user_id = ? ORDER BY created_at DESC'
  ).all(req.userId);
  res.json(rules.map(r => ({ ...r, dest_platforms: JSON.parse(r.dest_platforms || '[]') })));
});

// POST /api/scheduler/repurpose-rules
router.post('/repurpose-rules', requireSubscription, (req, res) => {
  const { brand_id, source_platform, dest_platforms, delay_hours, adapt_captions, caption_notes } = req.body;
  if (!source_platform || !dest_platforms?.length) {
    return res.status(400).json({ error: 'source_platform and dest_platforms required' });
  }
  const db = getDB();
  const id = uuid();
  db.prepare(`
    INSERT INTO repurpose_rules (id, user_id, brand_id, source_platform, dest_platforms, delay_hours, adapt_captions, caption_notes, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
  `).run(id, req.userId, brand_id || null, source_platform, JSON.stringify(dest_platforms), delay_hours ?? 2, adapt_captions ?? 1, caption_notes || '');
  const rule = db.prepare('SELECT * FROM repurpose_rules WHERE id = ?').get(id);
  res.status(201).json({ ...rule, dest_platforms: JSON.parse(rule.dest_platforms) });
});

// PATCH /api/scheduler/repurpose-rules/:id
router.patch('/repurpose-rules/:id', requireSubscription, (req, res) => {
  const { active, dest_platforms, delay_hours, adapt_captions, caption_notes } = req.body;
  const db = getDB();
  const updates = ["updated_at = datetime('now')"];
  const params = [];
  if (active !== undefined)        { updates.push('active = ?');          params.push(active ? 1 : 0); }
  if (dest_platforms)              { updates.push('dest_platforms = ?');   params.push(JSON.stringify(dest_platforms)); }
  if (delay_hours !== undefined)   { updates.push('delay_hours = ?');      params.push(delay_hours); }
  if (adapt_captions !== undefined){ updates.push('adapt_captions = ?');   params.push(adapt_captions ? 1 : 0); }
  if (caption_notes !== undefined) { updates.push('caption_notes = ?');    params.push(caption_notes); }
  params.push(req.params.id, req.userId);
  db.prepare(`UPDATE repurpose_rules SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...params);
  const rule = db.prepare('SELECT * FROM repurpose_rules WHERE id = ?').get(req.params.id);
  res.json({ ...rule, dest_platforms: JSON.parse(rule.dest_platforms || '[]') });
});

// DELETE /api/scheduler/repurpose-rules/:id
router.delete('/repurpose-rules/:id', requireSubscription, (req, res) => {
  const db = getDB();
  db.prepare('DELETE FROM repurpose_rules WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ success: true });
});

module.exports = router;
