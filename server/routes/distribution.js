// server/routes/distribution.js
// Distribution Room — Funnel Map, CTA Routing, Platform Publishing Tracker
// Core rule enforced: no orphan content — every piece routes attention

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// ─── FUNNELS ─────────────────────────────────────────────────────────────────

router.get('/funnels', (req, res) => {
  const db = getDB();
  const { brandId } = req.query;
  let query = 'SELECT * FROM funnels WHERE user_id = ?';
  const params = [req.userId];
  if (brandId) { query += ' AND brand_id = ?'; params.push(brandId); }
  query += ' ORDER BY created_at';
  const funnels = db.prepare(query).all(...params);

  // Attach CTA routes to each funnel
  const enriched = funnels.map(f => {
    const routes = db.prepare('SELECT * FROM cta_routes WHERE funnel_id = ? AND user_id = ?').all(f.id, req.userId);
    return { ...f, active: !!f.active, cta_routes: routes };
  });

  res.json(enriched);
});

router.post('/funnels', (req, res) => {
  const { brand_id, name, stage, entry_point, micro_conversion, lead_capture, nurture_step, conversion_step, notes } = req.body;
  if (!brand_id || !name) return res.status(400).json({ error: 'brand_id and name are required' });
  const db = getDB();
  const id = uuidv4();
  db.prepare(`
    INSERT INTO funnels (id, user_id, brand_id, name, stage, entry_point, micro_conversion, lead_capture, nurture_step, conversion_step, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.userId, brand_id, name,
    stage || 'TOFU', entry_point || '', micro_conversion || '',
    lead_capture || '', nurture_step || '', conversion_step || '', notes || '');
  res.status(201).json(db.prepare('SELECT * FROM funnels WHERE id = ?').get(id));
});

router.get('/funnels/:id', (req, res) => {
  const db = getDB();
  const funnel = db.prepare('SELECT * FROM funnels WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!funnel) return res.status(404).json({ error: 'Funnel not found' });
  const routes = db.prepare('SELECT * FROM cta_routes WHERE funnel_id = ? ORDER BY created_at').all(req.params.id);
  // Assets missing CTA destination (orphan check)
  const orphans = db.prepare(`
    SELECT a.id, a.title, a.platform FROM assets a
    WHERE a.brand_id = ? AND a.user_id = ?
    AND (a.cta_destination IS NULL OR a.cta_destination = '' OR a.cta_destination = 'Follow')
    AND a.status NOT IN ('Idea', 'Raw Idea')
  `).all(funnel.brand_id, req.userId);
  res.json({ ...funnel, cta_routes: routes, orphan_assets: orphans });
});

router.patch('/funnels/:id', (req, res) => {
  const db = getDB();
  const funnel = db.prepare('SELECT * FROM funnels WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!funnel) return res.status(404).json({ error: 'Funnel not found' });
  const fields = ['name', 'stage', 'entry_point', 'micro_conversion', 'lead_capture', 'nurture_step', 'conversion_step', 'active', 'notes'];
  const updates = {};
  fields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
  if (Object.keys(updates).length === 0) return res.json(funnel);
  const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE funnels SET ${setClause} WHERE id = ? AND user_id = ?`).run(...Object.values(updates), req.params.id, req.userId);
  res.json(db.prepare('SELECT * FROM funnels WHERE id = ?').get(req.params.id));
});

router.delete('/funnels/:id', (req, res) => {
  const db = getDB();
  const result = db.prepare('DELETE FROM funnels WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  if (result.changes === 0) return res.status(404).json({ error: 'Funnel not found' });
  res.json({ success: true });
});

// ─── CTA ROUTES ───────────────────────────────────────────────────────────────

router.get('/cta-routes', (req, res) => {
  const db = getDB();
  const { brandId, active, funnel_stage } = req.query;
  let query = 'SELECT * FROM cta_routes WHERE user_id = ?';
  const params = [req.userId];
  if (brandId) { query += ' AND brand_id = ?'; params.push(brandId); }
  if (active !== undefined) { query += ' AND active = ?'; params.push(active === 'true' ? 1 : 0); }
  if (funnel_stage) { query += ' AND funnel_stage = ?'; params.push(funnel_stage); }
  query += ' ORDER BY funnel_stage, created_at';
  const routes = db.prepare(query).all(...params);
  res.json(routes.map(r => ({ ...r, active: !!r.active, platform: JSON.parse(r.platform || '[]') })));
});

router.post('/cta-routes', (req, res) => {
  const { brand_id, funnel_id, label, cta_copy, destination_url, funnel_stage, platform, monthly_clicks, conversion_rate, notes } = req.body;
  if (!brand_id || !label) return res.status(400).json({ error: 'brand_id and label are required' });
  const db = getDB();
  const id = uuidv4();
  db.prepare(`
    INSERT INTO cta_routes (id, user_id, brand_id, funnel_id, label, cta_copy, destination_url, funnel_stage, platform, monthly_clicks, conversion_rate, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.userId, brand_id, funnel_id || null, label,
    cta_copy || '', destination_url || '',
    funnel_stage || 'TOFU', JSON.stringify(platform || []),
    monthly_clicks || 0, conversion_rate || 0, notes || '');
  const route = db.prepare('SELECT * FROM cta_routes WHERE id = ?').get(id);
  res.status(201).json({ ...route, active: !!route.active, platform: JSON.parse(route.platform || '[]') });
});

router.patch('/cta-routes/:id', (req, res) => {
  const db = getDB();
  const route = db.prepare('SELECT * FROM cta_routes WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!route) return res.status(404).json({ error: 'CTA route not found' });
  const fields = ['label', 'cta_copy', 'destination_url', 'funnel_stage', 'active', 'monthly_clicks', 'conversion_rate', 'notes'];
  const updates = {};
  fields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
  if (req.body.platform) updates.platform = JSON.stringify(req.body.platform);
  if (Object.keys(updates).length === 0) return res.json(route);
  const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE cta_routes SET ${setClause}, updated_at = datetime('now') WHERE id = ? AND user_id = ?`).run(...Object.values(updates), req.params.id, req.userId);
  const updated = db.prepare('SELECT * FROM cta_routes WHERE id = ?').get(req.params.id);
  res.json({ ...updated, active: !!updated.active, platform: JSON.parse(updated.platform || '[]') });
});

router.delete('/cta-routes/:id', (req, res) => {
  const db = getDB();
  const result = db.prepare('DELETE FROM cta_routes WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  if (result.changes === 0) return res.status(404).json({ error: 'CTA route not found' });
  res.json({ success: true });
});

// ─── PLATFORM STATS ───────────────────────────────────────────────────────────

router.get('/platform-stats', (req, res) => {
  const db = getDB();
  const { brandId } = req.query;
  let query = 'SELECT * FROM platform_stats WHERE user_id = ?';
  const params = [req.userId];
  if (brandId) { query += ' AND brand_id = ?'; params.push(brandId); }
  query += ' ORDER BY platform';
  res.json(db.prepare(query).all(...params));
});

router.post('/platform-stats', (req, res) => {
  const { brand_id, platform, target_per_week, followers_start, followers_current, avg_views, best_format, notes } = req.body;
  if (!brand_id || !platform) return res.status(400).json({ error: 'brand_id and platform are required' });
  const db = getDB();
  // Upsert — one row per brand+platform
  const existing = db.prepare('SELECT * FROM platform_stats WHERE brand_id = ? AND platform = ? AND user_id = ?').get(brand_id, platform, req.userId);
  if (existing) {
    const updates = {};
    ['target_per_week', 'published_this_week', 'followers_start', 'followers_current', 'avg_views', 'best_format', 'notes'].forEach(f => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });
    if (Object.keys(updates).length > 0) {
      const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
      db.prepare(`UPDATE platform_stats SET ${setClause}, updated_at = datetime('now') WHERE id = ?`).run(...Object.values(updates), existing.id);
    }
    return res.json(db.prepare('SELECT * FROM platform_stats WHERE id = ?').get(existing.id));
  }
  const id = uuidv4();
  db.prepare(`
    INSERT INTO platform_stats (id, user_id, brand_id, platform, target_per_week, followers_start, followers_current, avg_views, best_format, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.userId, brand_id, platform,
    target_per_week || 5, followers_start || 0, followers_current || 0,
    avg_views || 0, best_format || '', notes || '');
  res.status(201).json(db.prepare('SELECT * FROM platform_stats WHERE id = ?').get(id));
});

router.patch('/platform-stats/:id', (req, res) => {
  const db = getDB();
  const stat = db.prepare('SELECT * FROM platform_stats WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!stat) return res.status(404).json({ error: 'Platform stat not found' });
  const fields = ['target_per_week', 'published_this_week', 'followers_start', 'followers_current', 'avg_views', 'best_format', 'notes'];
  const updates = {};
  fields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
  if (Object.keys(updates).length === 0) return res.json(stat);
  const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE platform_stats SET ${setClause}, updated_at = datetime('now') WHERE id = ? AND user_id = ?`).run(...Object.values(updates), req.params.id, req.userId);
  res.json(db.prepare('SELECT * FROM platform_stats WHERE id = ?').get(req.params.id));
});

// ─── ORPHAN CHECK — key Distribution Room rule ────────────────────────────────
// Returns assets that are scripted/produced/published but have no CTA destination
router.get('/orphan-check', (req, res) => {
  const db = getDB();
  const { brandId } = req.query;
  if (!brandId) return res.status(400).json({ error: 'brandId required' });

  const orphans = db.prepare(`
    SELECT a.id, a.title, a.format, a.platform, a.status, a.funnel_stage, a.scheduled_date
    FROM assets a
    WHERE a.brand_id = ? AND a.user_id = ?
    AND a.status NOT IN ('Idea')
    AND (
      a.cta IS NULL OR a.cta = '' OR
      a.cta_destination IS NULL OR a.cta_destination = '' OR a.cta_destination = 'Follow'
    )
    ORDER BY a.status, a.scheduled_date
  `).all(brandId, req.userId);

  res.json({
    count: orphans.length,
    orphans,
    message: orphans.length === 0
      ? '✅ All content has a CTA destination. Zero orphans.'
      : `⚠️ ${orphans.length} content piece(s) are missing a CTA destination and will not route attention.`
  });
});

module.exports = router;
