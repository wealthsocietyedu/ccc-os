// server/routes/brands.js
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// ─── BRANDS ───────────────────────────────────────────────────────────────────

router.get('/', (req, res) => {
  const db = getDB();
  const brands = db.prepare('SELECT * FROM brands WHERE user_id = ? ORDER BY created_at').all(req.userId);
  const parsed = brands.map(b => ({ ...b, platforms: JSON.parse(b.platforms), active: !!b.active }));
  res.json(parsed);
});

router.post('/', (req, res) => {
  const { name, type, platforms, niche, dream_customer, voice_tone, primary_offer, monthly_goal, color } = req.body;
  if (!name) return res.status(400).json({ error: 'Brand name is required' });
  const db = getDB();
  const id = uuidv4();
  db.prepare(`
    INSERT INTO brands (id, user_id, name, type, platforms, niche, dream_customer, voice_tone, primary_offer, monthly_goal, color)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.userId, name, type || 'Personal Brand',
    JSON.stringify(platforms || []), niche || '', dream_customer || '',
    voice_tone || 'Direct', primary_offer || '', monthly_goal || 0,
    color || '#6C47FF');
  const brand = db.prepare('SELECT * FROM brands WHERE id = ?').get(id);
  res.status(201).json({ ...brand, platforms: JSON.parse(brand.platforms) });
});

router.get('/:id', (req, res) => {
  const db = getDB();
  const brand = db.prepare('SELECT * FROM brands WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!brand) return res.status(404).json({ error: 'Brand not found' });
  res.json({ ...brand, platforms: JSON.parse(brand.platforms) });
});

router.patch('/:id', (req, res) => {
  const db = getDB();
  const brand = db.prepare('SELECT * FROM brands WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!brand) return res.status(404).json({ error: 'Brand not found' });

  const fields = ['name', 'type', 'niche', 'dream_customer', 'voice_tone', 'primary_offer', 'monthly_goal', 'color', 'active', 'notes'];
  const updates = {};
  fields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
  if (req.body.platforms) updates.platforms = JSON.stringify(req.body.platforms);

  if (Object.keys(updates).length === 0) return res.json({ ...brand, platforms: JSON.parse(brand.platforms) });

  const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE brands SET ${setClause}, updated_at = datetime('now') WHERE id = ? AND user_id = ?`)
    .run(...Object.values(updates), req.params.id, req.userId);

  const updated = db.prepare('SELECT * FROM brands WHERE id = ?').get(req.params.id);
  res.json({ ...updated, platforms: JSON.parse(updated.platforms) });
});

router.delete('/:id', (req, res) => {
  const db = getDB();
  const result = db.prepare('DELETE FROM brands WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  if (result.changes === 0) return res.status(404).json({ error: 'Brand not found' });
  res.json({ success: true });
});

// ─── PILLARS ─────────────────────────────────────────────────────────────────

router.get('/:brandId/pillars', (req, res) => {
  const db = getDB();
  const pillars = db.prepare('SELECT * FROM pillars WHERE brand_id = ? AND user_id = ? ORDER BY created_at').all(req.params.brandId, req.userId);
  res.json(pillars);
});

router.post('/:brandId/pillars', (req, res) => {
  const { name, type, trigger, dream_outcome, persuasion, cta, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Pillar name is required' });
  const db = getDB();
  const id = uuidv4();
  db.prepare(`
    INSERT INTO pillars (id, user_id, brand_id, name, type, trigger, dream_outcome, persuasion, cta, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.userId, req.params.brandId, name, type || 'Authority',
    trigger || 'Freedom', dream_outcome || '', persuasion || '',
    cta || 'Follow', notes || '');
  const pillar = db.prepare('SELECT * FROM pillars WHERE id = ?').get(id);
  res.status(201).json(pillar);
});

router.patch('/:brandId/pillars/:id', (req, res) => {
  const db = getDB();
  const pillar = db.prepare('SELECT * FROM pillars WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!pillar) return res.status(404).json({ error: 'Pillar not found' });
  const fields = ['name', 'type', 'trigger', 'dream_outcome', 'persuasion', 'cta', 'notes'];
  const updates = {};
  fields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
  if (Object.keys(updates).length === 0) return res.json(pillar);
  const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE pillars SET ${setClause} WHERE id = ? AND user_id = ?`).run(...Object.values(updates), req.params.id, req.userId);
  res.json(db.prepare('SELECT * FROM pillars WHERE id = ?').get(req.params.id));
});

router.delete('/:brandId/pillars/:id', (req, res) => {
  const db = getDB();
  const result = db.prepare('DELETE FROM pillars WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  if (result.changes === 0) return res.status(404).json({ error: 'Pillar not found' });
  res.json({ success: true });
});

module.exports = router;
