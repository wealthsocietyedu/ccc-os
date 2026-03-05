// server/routes/data.js
// Data Room — Performance, Analytics, Weekly Reviews, Offers, Campaigns

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDB, reseedUserData } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// ─── PERFORMANCE ANALYTICS ────────────────────────────────────────────────────

// GET /api/data/analytics/:brandId — full analytics summary
router.get('/analytics/:brandId', (req, res) => {
  const db = getDB();
  const { brandId } = req.params;
  const { period = '30' } = req.query; // days

  const dateFilter = `AND p.publish_date >= date('now', '-${parseInt(period)} days')`;

  // Totals
  const totals = db.prepare(`
    SELECT
      COUNT(DISTINCT p.id) as posts,
      COALESCE(SUM(p.views), 0) as total_views,
      COALESCE(SUM(p.likes), 0) as total_likes,
      COALESCE(SUM(p.comments), 0) as total_comments,
      COALESCE(SUM(p.shares), 0) as total_shares,
      COALESCE(SUM(p.saves), 0) as total_saves,
      COALESCE(SUM(p.followers), 0) as total_followers,
      COALESCE(SUM(p.leads), 0) as total_leads,
      COALESCE(SUM(p.revenue), 0) as total_revenue
    FROM performance p
    WHERE p.brand_id = ? AND p.user_id = ? ${dateFilter}
  `).get(brandId, req.userId);

  // Engagement rate
  const engRate = totals.total_views > 0
    ? ((totals.total_likes + totals.total_comments + totals.total_shares + totals.total_saves) / totals.total_views * 100).toFixed(2)
    : 0;

  // By platform
  const byPlatform = db.prepare(`
    SELECT p.platform,
      COUNT(*) as posts,
      SUM(p.views) as views,
      SUM(p.leads) as leads,
      SUM(p.followers) as followers,
      AVG(CAST(p.likes + p.comments + p.shares + p.saves AS REAL) / NULLIF(p.views, 0) * 100) as avg_eng_rate
    FROM performance p
    WHERE p.brand_id = ? AND p.user_id = ? ${dateFilter}
    GROUP BY p.platform ORDER BY views DESC
  `).all(brandId, req.userId);

  // By pillar
  const byPillar = db.prepare(`
    SELECT pl.id, pl.name, pl.type,
      COUNT(p.id) as posts,
      COALESCE(SUM(p.views), 0) as views,
      COALESCE(SUM(p.leads), 0) as leads,
      COALESCE(AVG(CAST(p.likes + p.comments + p.shares + p.saves AS REAL) / NULLIF(p.views, 0) * 100), 0) as avg_eng_rate
    FROM pillars pl
    LEFT JOIN assets a ON a.pillar_id = pl.id
    LEFT JOIN performance p ON p.asset_id = a.id AND p.user_id = ?
    WHERE pl.brand_id = ? AND pl.user_id = ?
    GROUP BY pl.id ORDER BY views DESC
  `).all(req.userId, brandId, req.userId);

  // By format
  const byFormat = db.prepare(`
    SELECT a.format,
      COUNT(p.id) as posts,
      SUM(p.views) as views,
      SUM(p.leads) as leads,
      AVG(CAST(p.likes + p.comments + p.shares + p.saves AS REAL) / NULLIF(p.views, 0) * 100) as avg_eng_rate
    FROM performance p
    JOIN assets a ON a.id = p.asset_id
    WHERE p.brand_id = ? AND p.user_id = ? ${dateFilter}
    GROUP BY a.format ORDER BY views DESC
  `).all(brandId, req.userId);

  // Top performers with score
  const topPerformers = db.prepare(`
    SELECT a.id, a.title, a.format, a.platform, a.funnel_stage,
      p.views, p.likes, p.comments, p.shares, p.saves, p.followers, p.leads, p.revenue, p.decision,
      p.publish_date,
      ROUND(
        (CAST(p.views AS REAL) / 100000.0 * 0.3) +
        (CAST(p.likes + p.comments + p.shares + p.saves AS REAL) / NULLIF(p.views, 0) * 100.0 / 10.0 * 0.3) +
        (CAST(p.followers AS REAL) / 500.0 * 0.2) +
        (CAST(p.leads AS REAL) / 100.0 * 0.2),
        2
      ) as score
    FROM performance p
    JOIN assets a ON a.id = p.asset_id
    WHERE p.brand_id = ? AND p.user_id = ? ${dateFilter}
    ORDER BY score DESC LIMIT 10
  `).all(brandId, req.userId);

  // Bottom performers
  const bottomPerformers = db.prepare(`
    SELECT a.id, a.title, a.format, a.platform,
      p.views, p.leads, p.decision,
      ROUND(
        (CAST(p.views AS REAL) / 100000.0 * 0.3) +
        (CAST(p.likes + p.comments + p.shares + p.saves AS REAL) / NULLIF(p.views, 0) * 100.0 / 10.0 * 0.3) +
        (CAST(p.followers AS REAL) / 500.0 * 0.2) +
        (CAST(p.leads AS REAL) / 100.0 * 0.2),
        2
      ) as score
    FROM performance p
    JOIN assets a ON a.id = p.asset_id
    WHERE p.brand_id = ? AND p.user_id = ? ${dateFilter}
    ORDER BY score ASC LIMIT 5
  `).all(brandId, req.userId);

  res.json({
    period: parseInt(period),
    totals: { ...totals, engagement_rate: parseFloat(engRate) },
    by_platform: byPlatform,
    by_pillar: byPillar,
    by_format: byFormat,
    top_performers: topPerformers,
    bottom_performers: bottomPerformers,
  });
});

// ─── WEEKLY REVIEWS ───────────────────────────────────────────────────────────

router.get('/reviews', (req, res) => {
  const db = getDB();
  const { brandId } = req.query;
  let query = 'SELECT * FROM weekly_reviews WHERE user_id = ?';
  const params = [req.userId];
  if (brandId) { query += ' AND brand_id = ?'; params.push(brandId); }
  query += ' ORDER BY week_date DESC LIMIT 12';
  const reviews = db.prepare(query).all(...params);
  res.json(reviews.map(r => ({
    ...r,
    top_performers: JSON.parse(r.top_performers),
    bottom_performers: JSON.parse(r.bottom_performers),
    scale_decisions: JSON.parse(r.scale_decisions),
    refine_decisions: JSON.parse(r.refine_decisions),
    kill_decisions: JSON.parse(r.kill_decisions),
  })));
});

router.patch('/reviews/:id', (req, res) => {
  const db = getDB();
  const review = db.prepare('SELECT * FROM weekly_reviews WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!review) return res.status(404).json({ error: 'Review not found' });
  const fields = ['week_date','posts_published','posts_goal','total_views','new_followers','leads_generated','revenue','best_hook_type','best_pillar','best_platform','next_week_plan'];
  const updates = ["updated_at = datetime('now')"]; const params = [];
  fields.forEach(f => { if (req.body[f] !== undefined) { updates.push(`${f} = ?`); params.push(req.body[f]); }});
  const jsonFields = ['top_performers','bottom_performers','scale_decisions','refine_decisions','kill_decisions'];
  jsonFields.forEach(f => { if (req.body[f] !== undefined) { updates.push(`${f} = ?`); params.push(JSON.stringify(req.body[f])); }});
  if (updates.length === 1) return res.json(review);
  params.push(req.params.id, req.userId);
  db.prepare(`UPDATE weekly_reviews SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...params);
  res.json(db.prepare('SELECT * FROM weekly_reviews WHERE id = ?').get(req.params.id));
});

router.post('/reviews', (req, res) => {
  const { brand_id, week_date, posts_published, posts_goal, total_views, new_followers, leads_generated, revenue, top_performers, bottom_performers, best_hook_type, best_pillar, best_platform, scale_decisions, refine_decisions, kill_decisions, next_week_plan } = req.body;
  if (!brand_id || !week_date) return res.status(400).json({ error: 'brand_id and week_date are required' });
  const db = getDB();
  const id = uuidv4();
  db.prepare(`
    INSERT INTO weekly_reviews (id, user_id, brand_id, week_date, posts_published, posts_goal, total_views, new_followers, leads_generated, revenue, top_performers, bottom_performers, best_hook_type, best_pillar, best_platform, scale_decisions, refine_decisions, kill_decisions, next_week_plan)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.userId, brand_id, week_date,
    posts_published || 0, posts_goal || 0, total_views || 0,
    new_followers || 0, leads_generated || 0, revenue || 0,
    JSON.stringify(top_performers || []), JSON.stringify(bottom_performers || []),
    best_hook_type || '', best_pillar || '', best_platform || '',
    JSON.stringify(scale_decisions || []), JSON.stringify(refine_decisions || []),
    JSON.stringify(kill_decisions || []), next_week_plan || '');
  res.status(201).json(db.prepare('SELECT * FROM weekly_reviews WHERE id = ?').get(id));
});

// ─── OFFERS ───────────────────────────────────────────────────────────────────

router.get('/offers', (req, res) => {
  const db = getDB();
  const { brandId } = req.query;
  let query = 'SELECT * FROM offers WHERE user_id = ?';
  const params = [req.userId];
  if (brandId) { query += ' AND brand_id = ?'; params.push(brandId); }
  query += ' ORDER BY price ASC';
  const offers = db.prepare(query).all(...params);
  res.json(offers.map(o => ({ ...o, active: !!o.active })));
});

router.post('/offers', (req, res) => {
  const { brand_id, name, type, price, conversion_rate, monthly_units_goal, sales_page_url, notes } = req.body;
  if (!brand_id || !name) return res.status(400).json({ error: 'brand_id and name are required' });
  const db = getDB();
  const id = uuidv4();
  db.prepare(`
    INSERT INTO offers (id, user_id, brand_id, name, type, price, conversion_rate, monthly_units_goal, sales_page_url, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.userId, brand_id, name, type || 'Core Offer',
    price || 0, conversion_rate || 2, monthly_units_goal || 10,
    sales_page_url || '', notes || '');
  const offer = db.prepare('SELECT * FROM offers WHERE id = ?').get(id);
  res.status(201).json({ ...offer, active: !!offer.active });
});

router.patch('/offers/:id', (req, res) => {
  const db = getDB();
  const offer = db.prepare('SELECT * FROM offers WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!offer) return res.status(404).json({ error: 'Offer not found' });
  const fields = ['name', 'type', 'price', 'conversion_rate', 'monthly_units_goal', 'active', 'sales_page_url', 'notes'];
  const updates = {};
  fields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
  if (Object.keys(updates).length === 0) return res.json(offer);
  const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE offers SET ${setClause} WHERE id = ? AND user_id = ?`).run(...Object.values(updates), req.params.id, req.userId);
  const updated = db.prepare('SELECT * FROM offers WHERE id = ?').get(req.params.id);
  res.json({ ...updated, active: !!updated.active });
});

router.delete('/offers/:id', (req, res) => {
  const db = getDB();
  const result = db.prepare('DELETE FROM offers WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  if (result.changes === 0) return res.status(404).json({ error: 'Offer not found' });
  res.json({ success: true });
});

// ─── CAMPAIGNS ────────────────────────────────────────────────────────────────

router.get('/campaigns', (req, res) => {
  const db = getDB();
  const { brandId, status } = req.query;
  let query = 'SELECT * FROM campaigns WHERE user_id = ?';
  const params = [req.userId];
  if (brandId) { query += ' AND brand_id = ?'; params.push(brandId); }
  if (status) { query += ' AND status = ?'; params.push(status); }
  query += ' ORDER BY start_date DESC';
  res.json(db.prepare(query).all(...params));
});

router.post('/campaigns', (req, res) => {
  const { brand_id, offer_id, name, type, start_date, end_date, revenue_goal, leads_goal, pieces_planned, notes } = req.body;
  if (!brand_id || !name || !start_date || !end_date) return res.status(400).json({ error: 'brand_id, name, start_date, end_date are required' });
  const db = getDB();
  const id = uuidv4();
  db.prepare(`
    INSERT INTO campaigns (id, user_id, brand_id, offer_id, name, type, start_date, end_date, revenue_goal, leads_goal, pieces_planned, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.userId, brand_id, offer_id || null, name,
    type || 'Launch', start_date, end_date,
    revenue_goal || 0, leads_goal || 0, pieces_planned || 0, notes || '');
  res.status(201).json(db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id));
});

router.patch('/campaigns/:id', (req, res) => {
  const db = getDB();
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
  const fields = ['name', 'type', 'start_date', 'end_date', 'revenue_goal', 'leads_goal', 'pieces_planned', 'leads_actual', 'status', 'notes'];
  const updates = {};
  fields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
  if (Object.keys(updates).length === 0) return res.json(campaign);
  const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE campaigns SET ${setClause} WHERE id = ? AND user_id = ?`).run(...Object.values(updates), req.params.id, req.userId);
  res.json(db.prepare('SELECT * FROM campaigns WHERE id = ?').get(req.params.id));
});

// ─── BRAND DEALS ──────────────────────────────────────────────────────────────

router.get('/deals', (req, res) => {
  const db = getDB();
  const { brandId, status } = req.query;
  let query = 'SELECT * FROM brand_deals WHERE user_id = ?';
  const params = [req.userId];
  if (brandId) { query += ' AND brand_id = ?'; params.push(brandId); }
  if (status)  { query += ' AND status = ?';   params.push(status); }
  query += ' ORDER BY created_at DESC';
  res.json(db.prepare(query).all(...params));
});

router.post('/deals', (req, res) => {
  const db = getDB();
  const { brand_id, partner_name, deal_type, amount, status, deliverables, deadline, notes } = req.body;
  if (!partner_name) return res.status(400).json({ error: 'partner_name required' });
  const id = uuidv4();
  db.prepare(`INSERT INTO brand_deals (id, user_id, brand_id, partner_name, deal_type, amount, status, deliverables, deadline, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, req.userId, brand_id || null, partner_name, deal_type || 'Paid', amount || 0, status || 'Inbound', deliverables || '', deadline || null, notes || '');
  res.status(201).json(db.prepare('SELECT * FROM brand_deals WHERE id = ?').get(id));
});

router.patch('/deals/:id', (req, res) => {
  const db = getDB();
  const deal = db.prepare('SELECT id FROM brand_deals WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!deal) return res.status(404).json({ error: 'Deal not found' });
  const fields = ['partner_name','deal_type','amount','status','deliverables','deadline','notes'];
  const updates = ["updated_at = datetime('now')"]; const params = [];
  fields.forEach(f => { if (req.body[f] !== undefined) { updates.push(`${f} = ?`); params.push(req.body[f]); }});
  if (updates.length === 1) return res.json(deal);
  params.push(req.params.id, req.userId);
  db.prepare(`UPDATE brand_deals SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...params);
  res.json(db.prepare('SELECT * FROM brand_deals WHERE id = ?').get(req.params.id));
});

router.delete('/deals/:id', (req, res) => {
  const db = getDB();
  db.prepare('DELETE FROM brand_deals WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ success: true });
});

// ─── ADMIN: RESEED ────────────────────────────────────────────────────────────
// POST /api/data/reseed — wipes and re-inserts all seed demo data for the current user
// Fixes KPI cards showing $0 revenue for accounts seeded before revenue was added to performance rows.
// Requires auth only — each user can only reseed their own data.
router.post('/reseed', (req, res) => {
  try {
    reseedUserData(req.userId);
    res.json({ success: true, message: 'Seed data refreshed with correct revenue values.' });
  } catch (err) {
    console.error('[Reseed] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
