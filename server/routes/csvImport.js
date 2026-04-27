// server/routes/csvImport.js
// CSV Import Engine — maps platform exports to CCC OS performance table
// Supports: Instagram, YouTube, TikTok, X (Twitter), and generic CSV

const express = require('express');
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// Memory storage — we parse in-memory, never save to disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are accepted'));
    }
  }
});

// ─── PLATFORM COLUMN MAPS ─────────────────────────────────────────────────────
// Each platform exports different column names. We normalize them.

const COLUMN_MAPS = {
  instagram: {
    detect: (headers) => headers.some(h => /impressions|reach/i.test(h)) && headers.some(h => /publish|post.time/i.test(h)),
    map: {
      title: ['Post', 'Description', 'Caption', 'post_description'],
      publish_date: ['Publish time', 'Post time', 'Date', 'publish_time'],
      views: ['Impressions', 'Views', 'Video views', 'impressions'],
      reach: ['Reach', 'reach'],
      likes: ['Likes', 'likes'],
      comments: ['Comments', 'comments'],
      shares: ['Shares', 'shares'],
      saves: ['Saves', 'saves'],
      followers: ['Follows', 'New followers', 'followers_gained'],
      link_clicks: ['Link clicks', 'Profile visits', 'link_clicks'],
    },
    platform: 'Instagram'
  },

  youtube: {
    detect: (headers) => headers.some(h => /views/i.test(h)) && headers.some(h => /watch.time|subscribers/i.test(h)),
    map: {
      title: ['Video title', 'Content', 'Title', 'video_title'],
      publish_date: ['Video publish time', 'Publish date', 'Date', 'publish_time'],
      views: ['Views', 'views'],
      reach: ['Impressions', 'impressions'],
      likes: ['Likes', 'likes'],
      comments: ['Comments', 'comments'],
      shares: ['Shares', 'shares'],
      saves: ['Saves to playlist', 'saves'],
      followers: ['Subscribers gained', 'subscribers_gained'],
      link_clicks: ['Card clicks', 'External link clicks'],
    },
    platform: 'YouTube'
  },

  tiktok: {
    detect: (headers) => headers.some(h => /video.views|play/i.test(h)),
    map: {
      title: ['Video title', 'Caption', 'Description', 'video_title'],
      publish_date: ['Date', 'Post date', 'Publish time', 'date'],
      views: ['Video views', 'Views', 'Play count', 'video_views'],
      reach: ['Reached audience', 'Unique viewers', 'reached_audience'],
      likes: ['Likes', 'likes'],
      comments: ['Comments', 'comments'],
      shares: ['Shares', 'shares'],
      saves: ['Saved', 'saves'],
      followers: ['New followers', 'Followers gained', 'followers_gained'],
      link_clicks: ['Profile visits', 'Link clicks'],
    },
    platform: 'TikTok'
  },

  twitter: {
    detect: (headers) => headers.some(h => /impressions/i.test(h)) && headers.some(h => /engagements/i.test(h)),
    map: {
      title: ['Tweet text', 'Text', 'tweet_text'],
      publish_date: ['time', 'Date', 'Created at', 'date'],
      views: ['impressions', 'Impressions'],
      reach: ['impressions', 'Impressions'],
      likes: ['likes', 'Likes', 'Favorites'],
      comments: ['replies', 'Replies'],
      shares: ['retweets', 'Retweets'],
      saves: ['Bookmarks', 'bookmarks'],
      followers: ['user_profile_clicks'],
      link_clicks: ['url_clicks', 'Link clicks'],
    },
    platform: 'X (Twitter)'
  }
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function detectPlatform(headers) {
  for (const [platform, config] of Object.entries(COLUMN_MAPS)) {
    if (config.detect(headers)) return platform;
  }
  return 'generic';
}

function findColumn(row, candidates) {
  for (const candidate of candidates) {
    // Exact match first
    if (row[candidate] !== undefined) return row[candidate];
    // Case-insensitive match
    const key = Object.keys(row).find(k => k.toLowerCase() === candidate.toLowerCase());
    if (key) return row[key];
  }
  return null;
}

function toInt(val) {
  if (val === null || val === undefined || val === '') return 0;
  const n = parseInt(String(val).replace(/[^0-9.-]/g, ''), 10);
  return isNaN(n) ? 0 : n;
}

function parseDate(val) {
  if (!val) return new Date().toISOString().split('T')[0];
  // Try common formats
  const d = new Date(val);
  if (!isNaN(d)) return d.toISOString().split('T')[0];
  // Try MM/DD/YYYY
  const parts = String(val).split('/');
  if (parts.length === 3) {
    const d2 = new Date(`${parts[2]}-${parts[0].padStart(2,'0')}-${parts[1].padStart(2,'0')}`);
    if (!isNaN(d2)) return d2.toISOString().split('T')[0];
  }
  return new Date().toISOString().split('T')[0];
}

function findOrCreateAsset(db, userId, brandId, title, platform) {
  // Try to find existing asset with same title and brand
  const existing = db.prepare(`
    SELECT id FROM assets
    WHERE user_id = ? AND brand_id = ? AND title = ?
    LIMIT 1
  `).get(userId, brandId, title);

  if (existing) return existing.id;

  // Auto-create a minimal asset
  const id = uuidv4();
  db.prepare(`
    INSERT INTO assets (id, user_id, brand_id, title, format, platform, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'Short Form Video', ?, 'Published', datetime('now'), datetime('now'))
  `).run(id, userId, brandId, title || 'Untitled', platform);

  return id;
}

// ─── ENDPOINT 1: PREVIEW CSV ─────────────────────────────────────────────────
// POST /api/csv-import/preview
// Upload CSV → returns detected platform, column mapping, sample rows

router.post('/preview', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const content = req.file.buffer.toString('utf-8');
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true // handles Excel BOM
    });

    if (!records.length) return res.status(400).json({ error: 'CSV is empty or has no data rows' });

    const headers = Object.keys(records[0]);
    const detectedPlatform = detectPlatform(headers);
    const platformConfig = COLUMN_MAPS[detectedPlatform];

    // Build column mapping preview
    let columnMapping = {};
    if (platformConfig) {
      for (const [field, candidates] of Object.entries(platformConfig.map)) {
        const found = candidates.find(c =>
          headers.some(h => h.toLowerCase() === c.toLowerCase())
        );
        columnMapping[field] = found || null;
      }
    }

    // Sample rows (first 3)
    const sample = records.slice(0, 3).map(row => {
      const mapped = {};
      if (platformConfig) {
        for (const [field, candidates] of Object.entries(platformConfig.map)) {
          mapped[field] = findColumn(row, candidates);
        }
      }
      return mapped;
    });

    res.json({
      success: true,
      detectedPlatform: platformConfig?.platform || 'Generic CSV',
      platformKey: detectedPlatform,
      totalRows: records.length,
      headers,
      columnMapping,
      sample,
      // Return raw for manual override
      rawHeaders: headers
    });

  } catch (error) {
    console.error('CSV preview error:', error);
    res.status(400).json({ error: 'Failed to parse CSV', details: error.message });
  }
});

// ─── ENDPOINT 2: IMPORT CSV ───────────────────────────────────────────────────
// POST /api/csv-import/import
// Imports parsed CSV rows into performance table

router.post('/import', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const { brandId, platformOverride, columnOverrides } = req.body;
  if (!brandId) return res.status(400).json({ error: 'brandId is required' });

  const db = getDB();

  // Verify brand belongs to user
  const brand = db.prepare('SELECT id FROM brands WHERE id = ? AND user_id = ?').get(brandId, req.userId);
  if (!brand) return res.status(403).json({ error: 'Brand not found' });

  try {
    const content = req.file.buffer.toString('utf-8');
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true
    });

    if (!records.length) return res.status(400).json({ error: 'CSV is empty' });

    const headers = Object.keys(records[0]);
    const platformKey = platformOverride || detectPlatform(headers);
    const platformConfig = COLUMN_MAPS[platformKey];
    const platformName = platformConfig?.platform || platformOverride || 'Unknown';

    // Parse column overrides (user can correct column mapping in UI)
    let overrides = {};
    try { overrides = columnOverrides ? JSON.parse(columnOverrides) : {}; } catch(e) {}

    const columnMap = { ...platformConfig?.map };
    // Apply user overrides
    for (const [field, header] of Object.entries(overrides)) {
      if (header) columnMap[field] = [header];
    }

    // Import rows in a transaction
    let imported = 0;
    let skipped = 0;
    const errors = [];

    const insertPerf = db.prepare(`
      INSERT INTO performance (
        id, user_id, asset_id, brand_id, platform, publish_date,
        views, reach, likes, comments, shares, saves,
        followers, link_clicks, leads, revenue,
        notes, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, 0, 0,
        ?, datetime('now'), datetime('now')
      )
    `);

    const importMany = db.transaction((rows) => {
      for (const row of rows) {
        try {
          const title = findColumn(row, columnMap.title || ['Title', 'title', 'Post', 'Caption']) || 'Untitled Post';
          const publishDate = parseDate(findColumn(row, columnMap.publish_date || ['Date', 'date']));
          const views = toInt(findColumn(row, columnMap.views || ['Views', 'views', 'Impressions']));
          const reach = toInt(findColumn(row, columnMap.reach || ['Reach', 'reach']));
          const likes = toInt(findColumn(row, columnMap.likes || ['Likes', 'likes']));
          const comments = toInt(findColumn(row, columnMap.comments || ['Comments', 'comments']));
          const shares = toInt(findColumn(row, columnMap.shares || ['Shares', 'shares']));
          const saves = toInt(findColumn(row, columnMap.saves || ['Saves', 'saves']));
          const followers = toInt(findColumn(row, columnMap.followers || ['Followers', 'followers']));
          const linkClicks = toInt(findColumn(row, columnMap.link_clicks || ['Link clicks', 'link_clicks']));

          // Skip rows with no meaningful data
          if (views === 0 && likes === 0 && !title.trim()) { skipped++; continue; }

          // Find or create asset
          const assetId = findOrCreateAsset(db, req.userId, brandId, title.slice(0, 200), platformName);

          // Check for duplicate (same asset + same date + same platform)
          const duplicate = db.prepare(`
            SELECT id FROM performance
            WHERE user_id = ? AND asset_id = ? AND platform = ? AND publish_date = ?
          `).get(req.userId, assetId, platformName, publishDate);

          if (duplicate) { skipped++; continue; }

          insertPerf.run(
            uuidv4(), req.userId, assetId, brandId, platformName, publishDate,
            views, reach, likes, comments, shares, saves,
            followers, linkClicks,
            `Imported from CSV on ${new Date().toLocaleDateString()}`
          );

          imported++;
        } catch (rowError) {
          errors.push(`Row error: ${rowError.message}`);
          skipped++;
        }
      }
    });

    importMany(records);

    res.json({
      success: true,
      imported,
      skipped,
      total: records.length,
      platform: platformName,
      errors: errors.slice(0, 5), // first 5 errors only
      message: `Successfully imported ${imported} posts from ${platformName}.${skipped > 0 ? ` ${skipped} rows skipped (duplicates or empty).` : ''}`
    });

  } catch (error) {
    console.error('CSV import error:', error);
    res.status(500).json({ error: 'Import failed', details: error.message });
  }
});

// ─── ENDPOINT 3: IMPORT STATUS ────────────────────────────────────────────────
// GET /api/csv-import/status
// Returns how many performance rows exist per platform for this user

router.get('/status', (req, res) => {
  const db = getDB();

  const stats = db.prepare(`
    SELECT
      platform,
      COUNT(*) as posts,
      MAX(publish_date) as latest_date,
      MIN(publish_date) as earliest_date,
      SUM(views) as total_views
    FROM performance
    WHERE user_id = ?
    GROUP BY platform
    ORDER BY posts DESC
  `).all(req.userId);

  const total = db.prepare('SELECT COUNT(*) as count FROM performance WHERE user_id = ?').get(req.userId);

  res.json({
    success: true,
    total: total.count,
    byPlatform: stats,
    hasData: total.count > 0
  });
});

// ─── ENDPOINT 4: CLEAR IMPORTS ────────────────────────────────────────────────
// DELETE /api/csv-import/clear
// Clears all imported performance data for a brand (fresh start)

router.delete('/clear', (req, res) => {
  const { brandId } = req.body;
  if (!brandId) return res.status(400).json({ error: 'brandId is required' });

  const db = getDB();
  const result = db.prepare(`
    DELETE FROM performance
    WHERE user_id = ? AND brand_id = ?
    AND notes LIKE '%Imported from CSV%'
  `).run(req.userId, brandId);

  res.json({ success: true, deleted: result.changes });
});

module.exports = router;
