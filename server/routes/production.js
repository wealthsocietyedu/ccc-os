// server/routes/production.js
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// ─── CONTENT ASSETS ───────────────────────────────────────────────────────────

router.get('/assets', (req, res) => {
  const db = getDB();
  const { brandId, status, format, platform, funnel_stage } = req.query;
  let query = 'SELECT * FROM assets WHERE user_id = ?';
  const params = [req.userId];
  if (brandId) { query += ' AND brand_id = ?'; params.push(brandId); }
  if (status) { query += ' AND status = ?'; params.push(status); }
  if (format) { query += ' AND format = ?'; params.push(format); }
  if (platform) { query += ' AND platform = ?'; params.push(platform); }
  if (funnel_stage) { query += ' AND funnel_stage = ?'; params.push(funnel_stage); }
  query += ' ORDER BY created_at DESC';
  res.json(db.prepare(query).all(...params));
});

router.post('/assets', (req, res) => {
  const { brand_id, pillar_id, title, format, platform, status, hook, script, cta, cta_destination, funnel_stage, trigger, persuasion, scheduled_date, batch_group } = req.body;
  if (!brand_id || !title) return res.status(400).json({ error: 'brand_id and title are required' });
  const db = getDB();
  const id = uuidv4();
  db.prepare(`
    INSERT INTO assets (id, user_id, brand_id, pillar_id, title, format, platform, status, hook, script, cta, cta_destination, funnel_stage, trigger, persuasion, scheduled_date, batch_group)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.userId, brand_id, pillar_id || null, title,
    format || 'Short Form Video', platform || 'TikTok', status || 'Idea',
    hook || '', script || '', cta || '', cta_destination || 'Follow',
    funnel_stage || 'TOFU', trigger || '', persuasion || '',
    scheduled_date || null, batch_group || '');
  res.status(201).json(db.prepare('SELECT * FROM assets WHERE id = ?').get(id));
});

router.get('/assets/:id', (req, res) => {
  const db = getDB();
  const asset = db.prepare('SELECT * FROM assets WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!asset) return res.status(404).json({ error: 'Asset not found' });
  const perf = db.prepare('SELECT * FROM performance WHERE asset_id = ? ORDER BY created_at DESC LIMIT 1').get(req.params.id);
  res.json({ ...asset, performance: perf || null });
});

router.patch('/assets/:id', (req, res) => {
  const db = getDB();
  const asset = db.prepare('SELECT * FROM assets WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!asset) return res.status(404).json({ error: 'Asset not found' });
  const fields = ['pillar_id', 'title', 'format', 'platform', 'status', 'hook', 'script', 'cta', 'cta_destination', 'funnel_stage', 'trigger', 'persuasion', 'scheduled_date', 'published_date', 'batch_group', 'decision', 'repurpose_status', 'assigned_to'];
  const updates = {};
  fields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
  if (Object.keys(updates).length === 0) return res.json(asset);
  const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE assets SET ${setClause}, updated_at = datetime('now') WHERE id = ? AND user_id = ?`).run(...Object.values(updates), req.params.id, req.userId);
  res.json(db.prepare('SELECT * FROM assets WHERE id = ?').get(req.params.id));
});

router.delete('/assets/:id', (req, res) => {
  const db = getDB();
  const result = db.prepare('DELETE FROM assets WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  if (result.changes === 0) return res.status(404).json({ error: 'Asset not found' });
  res.json({ success: true });
});

// ─── PERFORMANCE ──────────────────────────────────────────────────────────────

router.post('/assets/:id/performance', (req, res) => {
  const db = getDB();
  const asset = db.prepare('SELECT * FROM assets WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!asset) return res.status(404).json({ error: 'Asset not found' });
  const { views, reach, likes, comments, shares, saves, followers, link_clicks, leads, revenue, decision, notes } = req.body;
  const perfId = uuidv4();
  db.prepare(`
    INSERT INTO performance (id, user_id, asset_id, brand_id, platform, publish_date, views, reach, likes, comments, shares, saves, followers, link_clicks, leads, revenue, decision, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(perfId, req.userId, req.params.id, asset.brand_id, asset.platform,
    req.body.publish_date || new Date().toISOString().split('T')[0],
    views || 0, reach || 0, likes || 0, comments || 0, shares || 0, saves || 0,
    followers || 0, link_clicks || 0, leads || 0, revenue || 0,
    decision || null, notes || '');

  // If decision set, update asset
  if (decision) {
    db.prepare('UPDATE assets SET decision = ? WHERE id = ?').run(decision, req.params.id);
  }
  if (req.body.publish_date) {
    db.prepare('UPDATE assets SET published_date = ?, status = \'Published\' WHERE id = ?').run(req.body.publish_date, req.params.id);
  }

  res.status(201).json(db.prepare('SELECT * FROM performance WHERE id = ?').get(perfId));
});

// ─── IDEAS ────────────────────────────────────────────────────────────────────

router.get('/ideas', (req, res) => {
  const db = getDB();
  const { brandId, status, priority } = req.query;
  let query = 'SELECT * FROM ideas WHERE user_id = ?';
  const params = [req.userId];
  if (brandId) { query += ' AND brand_id = ?'; params.push(brandId); }
  if (status) { query += ' AND status = ?'; params.push(status); }
  if (priority) { query += ' AND priority = ?'; params.push(priority); }
  query += ' ORDER BY date_captured DESC';
  res.json(db.prepare(query).all(...params));
});

router.post('/ideas', (req, res) => {
  const { brand_id, pillar_id, title, format, platform, hook_angle, trigger, cta, status, priority, source } = req.body;
  if (!brand_id || !title) return res.status(400).json({ error: 'brand_id and title are required' });
  const db = getDB();
  const id = uuidv4();
  db.prepare(`
    INSERT INTO ideas (id, user_id, brand_id, pillar_id, title, format, platform, hook_angle, trigger, cta, status, priority, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.userId, brand_id, pillar_id || null, title,
    format || 'Short Form Video', JSON.stringify(platform || []),
    hook_angle || '', trigger || '', cta || 'Follow',
    status || 'Raw Idea', priority || 'Medium', source || 'Original');
  res.status(201).json(db.prepare('SELECT * FROM ideas WHERE id = ?').get(id));
});

router.patch('/ideas/:id', (req, res) => {
  const db = getDB();
  const idea = db.prepare('SELECT * FROM ideas WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!idea) return res.status(404).json({ error: 'Idea not found' });
  const fields = ['pillar_id', 'title', 'format', 'hook_angle', 'trigger', 'cta', 'status', 'priority', 'source'];
  const updates = {};
  fields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
  if (Object.keys(updates).length === 0) return res.json(idea);
  const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE ideas SET ${setClause} WHERE id = ? AND user_id = ?`).run(...Object.values(updates), req.params.id, req.userId);
  res.json(db.prepare('SELECT * FROM ideas WHERE id = ?').get(req.params.id));
});

router.delete('/ideas/:id', (req, res) => {
  const db = getDB();
  const result = db.prepare('DELETE FROM ideas WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  if (result.changes === 0) return res.status(404).json({ error: 'Idea not found' });
  res.json({ success: true });
});

// POST /api/production/ideas/:id/promote — turn idea into an asset
router.post('/ideas/:id/promote', (req, res) => {
  const db = getDB();
  const idea = db.prepare('SELECT * FROM ideas WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!idea) return res.status(404).json({ error: 'Idea not found' });
  const assetId = uuidv4();
  db.prepare(`
    INSERT INTO assets (id, user_id, brand_id, pillar_id, title, format, platform, status, hook, cta, funnel_stage)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'Scripted', ?, ?, 'TOFU')
  `).run(assetId, req.userId, idea.brand_id, idea.pillar_id, idea.title,
    idea.format, 'TikTok', idea.hook_angle || '', idea.cta || '');
  db.prepare("UPDATE ideas SET status = 'Scripted' WHERE id = ?").run(idea.id);
  res.status(201).json({ asset: db.prepare('SELECT * FROM assets WHERE id = ?').get(assetId), idea_id: idea.id });
});

// ─── REPURPOSED CONTENT ────────────────────────────────────────────────────────

router.get('/assets/:id/repurposed', (req, res) => {
  const db = getDB();
  res.json(db.prepare('SELECT * FROM repurposed_content WHERE source_asset_id = ? AND user_id = ? ORDER BY created_at DESC').all(req.params.id, req.userId));
});

router.post('/assets/:id/repurposed', (req, res) => {
  const db = getDB();
  const asset = db.prepare('SELECT * FROM assets WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!asset) return res.status(404).json({ error: 'Asset not found' });
  const { target_platform, target_format, status, notes } = req.body;
  if (!target_platform) return res.status(400).json({ error: 'target_platform required' });
  const id = uuidv4();
  db.prepare(`INSERT INTO repurposed_content (id, user_id, brand_id, source_asset_id, target_platform, target_format, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, req.userId, asset.brand_id, req.params.id, target_platform, target_format || 'Short Form Video', status || 'Planned', notes || '');
  res.status(201).json(db.prepare('SELECT * FROM repurposed_content WHERE id = ?').get(id));
});

router.get('/repurposed', (req, res) => {
  const db = getDB();
  const { brandId, status } = req.query;
  let query = `SELECT rc.*, a.title as source_title, a.platform as source_platform FROM repurposed_content rc LEFT JOIN assets a ON rc.source_asset_id = a.id WHERE rc.user_id = ?`;
  const params = [req.userId];
  if (brandId) { query += ' AND rc.brand_id = ?'; params.push(brandId); }
  if (status)  { query += ' AND rc.status = ?';   params.push(status); }
  query += ' ORDER BY rc.created_at DESC';
  res.json(db.prepare(query).all(...params));
});

router.patch('/repurposed/:id', (req, res) => {
  const db = getDB();
  const row = db.prepare('SELECT id FROM repurposed_content WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!row) return res.status(404).json({ error: 'Not found' });
  const { target_platform, target_format, status, notes } = req.body;
  const updates = ["updated_at = datetime('now')"]; const params = [];
  if (target_platform !== undefined) { updates.push('target_platform = ?'); params.push(target_platform); }
  if (target_format !== undefined)   { updates.push('target_format = ?');   params.push(target_format); }
  if (status !== undefined)          { updates.push('status = ?');          params.push(status); }
  if (notes !== undefined)           { updates.push('notes = ?');           params.push(notes); }
  params.push(req.params.id, req.userId);
  db.prepare(`UPDATE repurposed_content SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...params);
  res.json(db.prepare('SELECT * FROM repurposed_content WHERE id = ?').get(req.params.id));
});

router.delete('/repurposed/:id', (req, res) => {
  const db = getDB();
  db.prepare('DELETE FROM repurposed_content WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ success: true });
});

// ─── HOOKS ────────────────────────────────────────────────────────────────────

router.get('/hooks', (req, res) => {
  const db = getDB();
  const { brandId, status, type } = req.query;
  let query = 'SELECT * FROM hooks WHERE user_id = ?';
  const params = [req.userId];
  if (brandId) { query += ' AND (brand_id = ? OR brand_id IS NULL)'; params.push(brandId); }
  if (status) { query += ' AND status = ?'; params.push(status); }
  if (type) { query += ' AND type = ?'; params.push(type); }
  query += ' ORDER BY score DESC';
  res.json(db.prepare(query).all(...params));
});

router.post('/hooks', (req, res) => {
  const { brand_id, text, type, platform, emotion, trigger, score, status, source, notes } = req.body;
  if (!text) return res.status(400).json({ error: 'Hook text is required' });
  const db = getDB();
  const id = uuidv4();
  db.prepare(`
    INSERT INTO hooks (id, user_id, brand_id, text, type, platform, emotion, trigger, score, status, source, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.userId, brand_id || null, text,
    type || 'Curiosity Gap', JSON.stringify(platform || []),
    emotion || 'Curiosity', trigger || '', score || 0,
    status || 'Untested', source || 'Original', notes || '');
  res.status(201).json(db.prepare('SELECT * FROM hooks WHERE id = ?').get(id));
});

router.patch('/hooks/:id', (req, res) => {
  const db = getDB();
  const hook = db.prepare('SELECT * FROM hooks WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!hook) return res.status(404).json({ error: 'Hook not found' });
  const fields = ['text', 'type', 'emotion', 'trigger', 'score', 'times_used', 'status', 'source', 'notes'];
  const updates = {};
  fields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
  if (Object.keys(updates).length === 0) return res.json(hook);
  const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE hooks SET ${setClause} WHERE id = ? AND user_id = ?`).run(...Object.values(updates), req.params.id, req.userId);
  res.json(db.prepare('SELECT * FROM hooks WHERE id = ?').get(req.params.id));
});

router.delete('/hooks/:id', (req, res) => {
  const db = getDB();
  const result = db.prepare('DELETE FROM hooks WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  if (result.changes === 0) return res.status(404).json({ error: 'Hook not found' });
  res.json({ success: true });
});

module.exports = router;
