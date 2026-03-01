// server/routes/scheduler.js
// Scheduler & Distributor — Phase 1
// Handles: scheduled posts, platform connections, auto-workflows

const express = require('express');
const router = express.Router();
const { v4: uuid } = require('uuid');
const { getDB } = require('../db');
const { authenticate } = require('../middleware/auth');
const { requireSubscription } = require('../middleware/subscription');

// All routes require auth
router.use(authenticate);
router.use(requireSubscription);

// ─── PLATFORM CONNECTIONS ─────────────────────────────────────────────────────

// GET /api/scheduler/platforms — list connected platforms for user
router.get('/platforms', (req, res) => {
  const db = getDB();
  const platforms = db.prepare(`
    SELECT * FROM platform_connections WHERE user_id = ? ORDER BY created_at ASC
  `).all(req.userId);
  res.json(platforms);
});

// POST /api/scheduler/platforms/connect — initiate OAuth for a platform
// In production this returns an OAuth URL. Here we store the connection.
router.post('/platforms/connect', (req, res) => {
  const { platform, handle, access_token, refresh_token } = req.body;
  if (!platform) return res.status(400).json({ error: 'platform required' });

  const SUPPORTED = ['youtube', 'instagram', 'facebook', 'linkedin'];
  if (!SUPPORTED.includes(platform)) {
    return res.status(400).json({ error: `${platform} not yet supported. Coming soon.` });
  }

  const db = getDB();
  const existing = db.prepare(
    'SELECT id FROM platform_connections WHERE user_id = ? AND platform = ?'
  ).get(req.userId, platform);

  if (existing) {
    // Update existing connection
    db.prepare(`
      UPDATE platform_connections SET
        handle = ?, access_token = ?, refresh_token = ?,
        connected = 1, updated_at = datetime('now')
      WHERE user_id = ? AND platform = ?
    `).run(handle || '', access_token || '', refresh_token || '', req.userId, platform);
  } else {
    db.prepare(`
      INSERT INTO platform_connections
        (id, user_id, platform, handle, access_token, refresh_token, connected, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
    `).run(uuid(), req.userId, platform, handle || '', access_token || '', refresh_token || '');
  }

  res.json({ success: true, platform, connected: true });
});

// DELETE /api/scheduler/platforms/:platform — disconnect a platform
router.delete('/platforms/:platform', (req, res) => {
  const db = getDB();
  db.prepare(
    'UPDATE platform_connections SET connected = 0, access_token = \'\', refresh_token = \'\', updated_at = datetime(\'now\') WHERE user_id = ? AND platform = ?'
  ).run(req.userId, req.params.platform);
  res.json({ success: true });
});

// ─── OAUTH FLOW (Phase 1 — YouTube + Meta) ───────────────────────────────────

// GET /api/scheduler/oauth/:platform — get OAuth URL
router.get('/oauth/:platform', (req, res) => {
  const { platform } = req.params;
  const baseUrl = process.env.CLIENT_URL || 'http://localhost:3001';
  const redirectUri = `${baseUrl}/api/scheduler/oauth/${platform}/callback`;

  const oauthUrls = {
    youtube: `https://accounts.google.com/o/oauth2/v2/auth?` + new URLSearchParams({
      client_id: process.env.YOUTUBE_CLIENT_ID || '',
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube',
      access_type: 'offline',
      prompt: 'consent',
      state: req.userId,
    }),
    instagram: `https://api.instagram.com/oauth/authorize?` + new URLSearchParams({
      client_id: process.env.INSTAGRAM_APP_ID || '',
      redirect_uri: redirectUri,
      scope: 'instagram_basic,instagram_content_publish',
      response_type: 'code',
      state: req.userId,
    }),
    facebook: `https://www.facebook.com/v19.0/dialog/oauth?` + new URLSearchParams({
      client_id: process.env.FACEBOOK_APP_ID || '',
      redirect_uri: redirectUri,
      scope: 'pages_manage_posts,pages_read_engagement,publish_video',
      response_type: 'code',
      state: req.userId,
    }),
    linkedin: `https://www.linkedin.com/oauth/v2/authorization?` + new URLSearchParams({
      response_type: 'code',
      client_id: process.env.LINKEDIN_CLIENT_ID || '',
      redirect_uri: redirectUri,
      scope: 'w_member_social r_liteprofile',
      state: req.userId,
    }),
  };

  const url = oauthUrls[platform];
  if (!url) return res.status(400).json({ error: 'Platform not supported yet' });

  res.json({ oauth_url: url, platform });
});

// GET /api/scheduler/oauth/:platform/callback — OAuth callback handler
router.get('/oauth/:platform/callback', async (req, res) => {
  const { platform } = req.params;
  const { code, state: userId, error } = req.query;

  if (error) {
    return res.redirect(`${process.env.CLIENT_URL}/?scheduler=error&platform=${platform}`);
  }

  // In production: exchange code for access_token here
  // For now, log and redirect with success marker
  console.log(`OAuth callback for ${platform}, userId: ${userId}, code: ${code?.slice(0,10)}...`);

  // TODO: Exchange code for token using platform's token endpoint
  // Store token in platform_connections table

  res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/?scheduler=connected&platform=${platform}`);
});

// ─── SCHEDULED POSTS ─────────────────────────────────────────────────────────

// GET /api/scheduler/posts — list all scheduled posts for brand
router.get('/posts', (req, res) => {
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
router.post('/posts', (req, res) => {
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
router.patch('/posts/:id', (req, res) => {
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
router.delete('/posts/:id', (req, res) => {
  const db = getDB();
  db.prepare('DELETE FROM scheduled_posts WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ success: true });
});

// POST /api/scheduler/posts/:id/publish — publish immediately
router.post('/posts/:id/publish', async (req, res) => {
  const db = getDB();
  const post = db.prepare(
    'SELECT * FROM scheduled_posts WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.userId);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const destinations = JSON.parse(post.destinations || '[]');
  const connections = db.prepare(
    `SELECT * FROM platform_connections WHERE user_id = ? AND connected = 1 AND platform IN (${destinations.map(()=>'?').join(',')})`
  ).all(req.userId, ...destinations);

  // Mark as publishing
  db.prepare("UPDATE scheduled_posts SET status = 'publishing', updated_at = datetime('now') WHERE id = ?").run(post.id);

  const results = [];
  for (const dest of destinations) {
    const conn = connections.find(c => c.platform === dest);
    if (!conn) {
      results.push({ platform: dest, success: false, error: 'Not connected' });
      continue;
    }
    // Platform publish logic goes here (Phase 2 — API calls)
    // For Phase 1 — mark as success and log
    console.log(`[Scheduler] Publishing "${post.title}" to ${dest}`);
    results.push({ platform: dest, success: true });
  }

  const allSuccess = results.every(r => r.success);
  db.prepare(`
    UPDATE scheduled_posts SET
      status = ?, published_at = datetime('now'), updated_at = datetime('now')
    WHERE id = ?
  `).run(allSuccess ? 'published' : 'partial', post.id);

  res.json({ success: true, results, status: allSuccess ? 'published' : 'partial' });
});

// ─── AUTO-WORKFLOWS ───────────────────────────────────────────────────────────

// GET /api/scheduler/workflows
router.get('/workflows', (req, res) => {
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
router.post('/workflows', (req, res) => {
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
router.patch('/workflows/:id', (req, res) => {
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
router.delete('/workflows/:id', (req, res) => {
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

module.exports = router;
