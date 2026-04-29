// server/routes/xPublisher.js
// X Publisher — post, schedule, queue, autopilot

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Anthropic = require('@anthropic-ai/sdk');
const { getDB } = require('../db');
const { authenticate } = require('../middleware/auth');
const { postTweet, verifyCredentials } = require('../utils/xClient');

const router = express.Router();
router.use(authenticate);

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── HELPER: check tweet length ───────────────────────────────────────────────
function validateTweet(text) {
  if (!text || !text.trim()) return 'Tweet text is required';
  if (text.length > 280) return `Tweet is ${text.length} characters. Maximum is 280.`;
  return null;
}

// ─── ACCOUNTS ─────────────────────────────────────────────────────────────────

// GET /api/x-publisher/accounts
router.get('/accounts', (req, res) => {
  const db = getDB();
  const accounts = db.prepare(`
    SELECT id, display_name, username, is_active, slot, created_at
    FROM x_accounts
    WHERE user_id = ?
    ORDER BY slot ASC
  `).all(req.userId);
  res.json({ success: true, accounts });
});

// POST /api/x-publisher/accounts
router.post('/accounts', (req, res) => {
  const { displayName, username, apiKey, apiSecret, accessToken, accessSecret, slot } = req.body;
  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    return res.status(400).json({ error: 'All 4 credentials are required' });
  }

  const db = getDB();

  // Max 5 accounts
  const count = db.prepare('SELECT COUNT(*) as c FROM x_accounts WHERE user_id = ?').get(req.userId);
  if (count.c >= 5) {
    return res.status(400).json({ error: 'Maximum 5 accounts allowed' });
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO x_accounts (id, user_id, display_name, username, api_key, api_secret, access_token, access_secret, slot)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.userId, displayName || '', username || '', apiKey, apiSecret, accessToken, accessSecret, slot || count.c + 1);

  res.json({ success: true, id, message: 'Account added' });
});

// PUT /api/x-publisher/accounts/:id
router.put('/accounts/:id', (req, res) => {
  const { displayName, username, apiKey, apiSecret, accessToken, accessSecret, isActive } = req.body;
  const db = getDB();

  const account = db.prepare('SELECT id FROM x_accounts WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!account) return res.status(404).json({ error: 'Account not found' });

  const updates = [];
  const params = [];

  if (displayName !== undefined) { updates.push('display_name = ?'); params.push(displayName); }
  if (username !== undefined) { updates.push('username = ?'); params.push(username); }
  if (apiKey !== undefined) { updates.push('api_key = ?'); params.push(apiKey); }
  if (apiSecret !== undefined) { updates.push('api_secret = ?'); params.push(apiSecret); }
  if (accessToken !== undefined) { updates.push('access_token = ?'); params.push(accessToken); }
  if (accessSecret !== undefined) { updates.push('access_secret = ?'); params.push(accessSecret); }
  if (isActive !== undefined) { updates.push('is_active = ?'); params.push(isActive ? 1 : 0); }

  updates.push('updated_at = datetime(\'now\')');
  params.push(req.params.id, req.userId);

  db.prepare(`UPDATE x_accounts SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...params);
  res.json({ success: true });
});

// DELETE /api/x-publisher/accounts/:id
router.delete('/accounts/:id', (req, res) => {
  const db = getDB();
  db.prepare('DELETE FROM x_accounts WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ success: true });
});

// POST /api/x-publisher/accounts/:id/test
router.post('/accounts/:id/test', async (req, res) => {
  const db = getDB();
  const account = db.prepare('SELECT * FROM x_accounts WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!account) return res.status(404).json({ error: 'Account not found' });

  const result = await verifyCredentials(account);

  if (result.valid) {
    // Update username if we got it back
    if (result.username) {
      db.prepare('UPDATE x_accounts SET username = ?, updated_at = datetime(\'now\') WHERE id = ?')
        .run(result.username, account.id);
    }
  }

  res.json({ success: true, ...result });
});

// ─── POSTING ──────────────────────────────────────────────────────────────────

// POST /api/x-publisher/post — post immediately
router.post('/post', async (req, res) => {
  const { accountId, content } = req.body;
  if (!accountId) return res.status(400).json({ error: 'accountId is required' });

  const err = validateTweet(content);
  if (err) return res.status(400).json({ error: err });

  const db = getDB();
  const account = db.prepare('SELECT * FROM x_accounts WHERE id = ? AND user_id = ? AND is_active = 1').get(accountId, req.userId);
  if (!account) return res.status(404).json({ error: 'Account not found or inactive' });

  try {
    const tweet = await postTweet(account, content.trim());

    // Log to queue as published
    db.prepare(`
      INSERT INTO x_posts (id, user_id, account_id, content, mode, status, posted_at, tweet_id)
      VALUES (?, ?, ?, ?, 'manual', 'published', datetime('now'), ?)
    `).run(uuidv4(), req.userId, accountId, content.trim(), tweet.id);

    res.json({ success: true, tweetId: tweet.id, message: 'Posted successfully' });
  } catch (error) {
    // Log failure
    db.prepare(`
      INSERT INTO x_posts (id, user_id, account_id, content, mode, status, error_message)
      VALUES (?, ?, ?, ?, 'manual', 'failed', ?)
    `).run(uuidv4(), req.userId, accountId, content.trim(), error.message);

    res.status(500).json({ error: 'Failed to post', details: error.message });
  }
});

// POST /api/x-publisher/schedule — add to queue
router.post('/schedule', (req, res) => {
  const { accountId, content, scheduledAt, mode, ideaId } = req.body;
  if (!accountId) return res.status(400).json({ error: 'accountId is required' });
  if (!scheduledAt) return res.status(400).json({ error: 'scheduledAt is required' });

  const err = validateTweet(content);
  if (err) return res.status(400).json({ error: err });

  // Validate scheduled time is in the future
  if (new Date(scheduledAt) <= new Date()) {
    return res.status(400).json({ error: 'Scheduled time must be in the future' });
  }

  const db = getDB();
  const account = db.prepare('SELECT id FROM x_accounts WHERE id = ? AND user_id = ?').get(accountId, req.userId);
  if (!account) return res.status(404).json({ error: 'Account not found' });

  const id = uuidv4();
  db.prepare(`
    INSERT INTO x_posts (id, user_id, account_id, content, mode, status, scheduled_at, idea_id)
    VALUES (?, ?, ?, ?, ?, 'scheduled', ?, ?)
  `).run(id, req.userId, accountId, content.trim(), mode || 'manual', scheduledAt, ideaId || null);

  res.json({ success: true, id, scheduledAt, message: 'Post scheduled' });
});

// ─── QUEUE ────────────────────────────────────────────────────────────────────

// GET /api/x-publisher/queue
router.get('/queue', (req, res) => {
  const { accountId, status } = req.query;
  const db = getDB();

  let query = `
    SELECT p.*, a.display_name as account_name, a.username as account_username
    FROM x_posts p
    JOIN x_accounts a ON p.account_id = a.id
    WHERE p.user_id = ?
  `;
  const params = [req.userId];

  if (accountId) { query += ' AND p.account_id = ?'; params.push(accountId); }
  if (status) { query += ' AND p.status = ?'; params.push(status); }

  query += ' ORDER BY p.scheduled_at ASC, p.created_at DESC LIMIT 100';

  const posts = db.prepare(query).all(...params);
  res.json({ success: true, posts });
});

// DELETE /api/x-publisher/queue/:id — cancel
router.delete('/queue/:id', (req, res) => {
  const db = getDB();
  const post = db.prepare('SELECT id, status FROM x_posts WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  if (post.status === 'published') return res.status(400).json({ error: 'Cannot cancel a published post' });

  db.prepare('UPDATE x_posts SET status = \'cancelled\', updated_at = datetime(\'now\') WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// PUT /api/x-publisher/queue/:id/reschedule
router.put('/queue/:id/reschedule', (req, res) => {
  const { scheduledAt } = req.body;
  if (!scheduledAt) return res.status(400).json({ error: 'scheduledAt is required' });
  if (new Date(scheduledAt) <= new Date()) return res.status(400).json({ error: 'Must be in the future' });

  const db = getDB();
  db.prepare(`
    UPDATE x_posts SET scheduled_at = ?, status = 'scheduled', updated_at = datetime('now')
    WHERE id = ? AND user_id = ? AND status != 'published'
  `).run(scheduledAt, req.params.id, req.userId);

  res.json({ success: true });
});

// POST /api/x-publisher/queue/:id/retry
router.post('/queue/:id/retry', async (req, res) => {
  const db = getDB();
  const post = db.prepare(`
    SELECT p.*, a.api_key, a.api_secret, a.access_token, a.access_secret
    FROM x_posts p
    JOIN x_accounts a ON p.account_id = a.id
    WHERE p.id = ? AND p.user_id = ? AND p.status = 'failed'
  `).get(req.params.id, req.userId);

  if (!post) return res.status(404).json({ error: 'Failed post not found' });

  try {
    const tweet = await postTweet(post, post.content);
    db.prepare(`
      UPDATE x_posts SET status = 'published', posted_at = datetime('now'), tweet_id = ?, error_message = NULL, updated_at = datetime('now')
      WHERE id = ?
    `).run(tweet.id, post.id);
    res.json({ success: true, tweetId: tweet.id });
  } catch (error) {
    db.prepare('UPDATE x_posts SET error_message = ?, updated_at = datetime(\'now\') WHERE id = ?').run(error.message, post.id);
    res.status(500).json({ error: 'Retry failed', details: error.message });
  }
});

// ─── AI DRAFTING ──────────────────────────────────────────────────────────────

// POST /api/x-publisher/draft — Claude writes a tweet
router.post('/draft', async (req, res) => {
  const { topic, accountId, tone } = req.body;
  if (!topic) return res.status(400).json({ error: 'Topic is required' });

  const db = getDB();

  // Get brand context if account is linked to a brand
  let brandCtx = '';
  if (accountId) {
    const account = db.prepare('SELECT display_name, username FROM x_accounts WHERE id = ? AND user_id = ?').get(accountId, req.userId);
    if (account) brandCtx = `\nPosting as: @${account.username || account.display_name}`;
  }

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 200,
      system: `You are a world-class social media copywriter specializing in X (Twitter). You write tweets that stop the scroll, deliver value, and drive engagement. You never use hashtags unless asked. You write in a direct, conversational, authentic voice.${brandCtx}`,
      messages: [{
        role: 'user',
        content: `Write a tweet about: "${topic}"
Tone: ${tone || 'direct, value-driven, conversational'}
Rules: Under 280 characters. No hashtags. No emojis unless they add meaning. Make the first line the hook.
Return ONLY the tweet text. Nothing else.`
      }]
    });

    const draft = message.content[0].text.trim();
    res.json({ success: true, draft, characters: draft.length });
  } catch (error) {
    res.status(500).json({ error: 'Draft failed', details: error.message });
  }
});

// POST /api/x-publisher/enhance — Claude improves your draft
router.post('/enhance', async (req, res) => {
  const { content, goal } = req.body;
  if (!content) return res.status(400).json({ error: 'Content is required' });

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 200,
      system: 'You are a sharp Twitter copywriter. You make tweets more compelling without making them longer or adding hashtags.',
      messages: [{
        role: 'user',
        content: `Improve this tweet. Goal: ${goal || 'stronger hook, tighter copy, more engaging'}.
Stay under 280 characters.

ORIGINAL:
${content}

Return ONLY the improved tweet. Nothing else.`
      }]
    });

    const enhanced = message.content[0].text.trim();
    res.json({ success: true, enhanced, characters: enhanced.length });
  } catch (error) {
    res.status(500).json({ error: 'Enhance failed', details: error.message });
  }
});

// ─── AUTOPILOT ────────────────────────────────────────────────────────────────

// GET /api/x-publisher/autopilot
router.get('/autopilot', (req, res) => {
  const db = getDB();
  const configs = db.prepare(`
    SELECT ap.*, a.display_name, a.username
    FROM x_autopilot ap
    JOIN x_accounts a ON ap.account_id = a.id
    WHERE ap.user_id = ?
  `).all(req.userId);
  res.json({ success: true, configs });
});

// POST /api/x-publisher/autopilot — save config for an account
router.post('/autopilot', (req, res) => {
  const { accountId, scheduleDays, scheduleTime, contentDirection, pillarId, timezone } = req.body;
  if (!accountId) return res.status(400).json({ error: 'accountId is required' });

  const db = getDB();
  const account = db.prepare('SELECT id FROM x_accounts WHERE id = ? AND user_id = ?').get(accountId, req.userId);
  if (!account) return res.status(404).json({ error: 'Account not found' });

  const existing = db.prepare('SELECT id FROM x_autopilot WHERE account_id = ? AND user_id = ?').get(accountId, req.userId);

  if (existing) {
    db.prepare(`
      UPDATE x_autopilot SET
        schedule_days = ?, schedule_time = ?, content_direction = ?,
        pillar_id = ?, timezone = ?, updated_at = datetime('now')
      WHERE account_id = ? AND user_id = ?
    `).run(
      JSON.stringify(scheduleDays || ['monday', 'wednesday', 'friday']),
      scheduleTime || '09:00',
      contentDirection || '',
      pillarId || null,
      timezone || 'America/Chicago',
      accountId, req.userId
    );
  } else {
    db.prepare(`
      INSERT INTO x_autopilot (id, user_id, account_id, schedule_days, schedule_time, content_direction, pillar_id, timezone)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(), req.userId, accountId,
      JSON.stringify(scheduleDays || ['monday', 'wednesday', 'friday']),
      scheduleTime || '09:00',
      contentDirection || '',
      pillarId || null,
      timezone || 'America/Chicago'
    );
  }

  res.json({ success: true });
});

// POST /api/x-publisher/autopilot/toggle
router.post('/autopilot/toggle', (req, res) => {
  const { accountId, isActive } = req.body;
  if (!accountId) return res.status(400).json({ error: 'accountId is required' });

  const db = getDB();
  db.prepare(`
    UPDATE x_autopilot SET is_active = ?, updated_at = datetime('now')
    WHERE account_id = ? AND user_id = ?
  `).run(isActive ? 1 : 0, accountId, req.userId);

  res.json({ success: true, isActive });
});

module.exports = router;
