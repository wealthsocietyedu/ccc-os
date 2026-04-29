// server/routes/xPublisher.js
// X Publisher — OAuth connect flow + post + schedule + queue + autopilot

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Anthropic = require('@anthropic-ai/sdk');
const { getDB } = require('../db');
const { authenticate } = require('../middleware/auth');
const { getRequestToken, getAccessToken, postTweet, verifyCredentials } = require('../utils/xClient');

const router = express.Router();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CALLBACK_URL = `${process.env.CLIENT_URL || 'https://ccc-os-production.up.railway.app'}/api/x-publisher/callback`;

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function validateTweet(text) {
  if (!text || !text.trim()) return 'Tweet text is required';
  if (text.length > 280) return `Tweet is ${text.length} chars. Max is 280.`;
  return null;
}

// ─── OAUTH FLOW ───────────────────────────────────────────────────────────────

// GET /api/x-publisher/auth/start
// Step 1 — generate request token + return auth URL
// Requires auth — stores user_id with temp token so callback knows who to save account for
router.get('/auth/start', authenticate, async (req, res) => {
  const db = getDB();
  try {
    const { oauth_token, oauth_token_secret, url } = await getRequestToken(CALLBACK_URL);

    // Store temp token with user_id
    db.prepare(`
      INSERT OR REPLACE INTO oauth_temp_tokens (oauth_token, oauth_token_secret, user_id)
      VALUES (?, ?, ?)
    `).run(oauth_token, oauth_token_secret, req.userId);

    res.json({ success: true, authUrl: url });
  } catch (error) {
    console.error('[OAuth] Start error:', error.message);
    res.status(500).json({ error: 'Failed to start OAuth flow', details: error.message });
  }
});

// GET /api/x-publisher/callback
// Step 2 — X redirects here after user authorizes
// No auth middleware — this is called by X, not the user directly
router.get('/callback', async (req, res) => {
  const { oauth_token, oauth_verifier, denied } = req.query;
  const db = getDB();

  // User denied access
  if (denied) {
    return res.send(`
      <html><body>
      <script>
        if (window.opener) {
          window.opener.postMessage({ type: 'X_AUTH_DENIED' }, '*');
          window.close();
        } else {
          window.location.href = '/?x_auth=denied';
        }
      </script>
      <p>Authorization denied. You can close this window.</p>
      </body></html>
    `);
  }

  if (!oauth_token || !oauth_verifier) {
    return res.status(400).send('<p>Missing OAuth parameters</p>');
  }

  try {
    // Get stored temp token
    const temp = db.prepare('SELECT * FROM oauth_temp_tokens WHERE oauth_token = ?').get(oauth_token);
    if (!temp) {
      return res.status(400).send('<p>OAuth session expired. Please try connecting again.</p>');
    }

    // Exchange for access token
    const { accessToken, accessSecret, screenName, userId: xUserId } = await getAccessToken(
      oauth_token,
      temp.oauth_token_secret,
      oauth_verifier
    );

    // Check if account already connected
    const existing = db.prepare(
      'SELECT id FROM x_accounts WHERE user_id = ? AND username = ?'
    ).get(temp.user_id, screenName);

    if (existing) {
      // Update credentials
      db.prepare(`
        UPDATE x_accounts SET access_token = ?, access_secret = ?, x_user_id = ?, is_active = 1, updated_at = datetime('now')
        WHERE id = ?
      `).run(accessToken, accessSecret, xUserId, existing.id);
    } else {
      // Get slot number
      const count = db.prepare('SELECT COUNT(*) as c FROM x_accounts WHERE user_id = ?').get(temp.user_id);
      if (count.c >= 5) {
        return res.send(`
          <html><body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'X_AUTH_ERROR', error: 'Maximum 5 accounts allowed' }, '*');
              window.close();
            }
          </script>
          <p>Maximum 5 accounts reached.</p>
          </body></html>
        `);
      }

      // Save new account
      db.prepare(`
        INSERT INTO x_accounts (id, user_id, display_name, username, x_user_id, access_token, access_secret, slot)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(uuidv4(), temp.user_id, screenName, screenName, xUserId, accessToken, accessSecret, count.c + 1);
    }

    // Clean up temp token
    db.prepare('DELETE FROM oauth_temp_tokens WHERE oauth_token = ?').run(oauth_token);

    // Send success message to parent window and close popup
    res.send(`
      <html><body>
      <script>
        if (window.opener) {
          window.opener.postMessage({
            type: 'X_AUTH_SUCCESS',
            username: '${screenName}'
          }, '*');
          window.close();
        } else {
          window.location.href = '/?x_auth=success';
        }
      </script>
      <p>Connected @${screenName}! You can close this window.</p>
      </body></html>
    `);

  } catch (error) {
    console.error('[OAuth] Callback error:', error.message);
    db.prepare('DELETE FROM oauth_temp_tokens WHERE oauth_token = ?').run(oauth_token);
    res.send(`
      <html><body>
      <script>
        if (window.opener) {
          window.opener.postMessage({ type: 'X_AUTH_ERROR', error: '${error.message.replace(/'/g, "\\'")}' }, '*');
          window.close();
        }
      </script>
      <p>Error: ${error.message}</p>
      </body></html>
    `);
  }
});

// All routes below require authentication
router.use(authenticate);

// ─── ACCOUNTS ─────────────────────────────────────────────────────────────────

// GET /api/x-publisher/accounts
router.get('/accounts', (req, res) => {
  const db = getDB();
  const accounts = db.prepare(`
    SELECT id, display_name, username, is_active, slot, created_at
    FROM x_accounts WHERE user_id = ? ORDER BY slot ASC
  `).all(req.userId);
  res.json({ success: true, accounts });
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

  if (result.valid && result.username) {
    db.prepare("UPDATE x_accounts SET username = ?, updated_at = datetime('now') WHERE id = ?")
      .run(result.username, account.id);
  }

  res.json({ success: true, ...result });
});

// ─── POSTING ──────────────────────────────────────────────────────────────────

// POST /api/x-publisher/post
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

    db.prepare(`
      INSERT INTO x_posts (id, user_id, account_id, content, mode, status, posted_at, tweet_id)
      VALUES (?, ?, ?, ?, 'manual', 'published', datetime('now'), ?)
    `).run(uuidv4(), req.userId, accountId, content.trim(), tweet.id);

    res.json({ success: true, tweetId: tweet.id, message: 'Posted successfully' });
  } catch (error) {
    db.prepare(`
      INSERT INTO x_posts (id, user_id, account_id, content, mode, status, error_message)
      VALUES (?, ?, ?, ?, 'manual', 'failed', ?)
    `).run(uuidv4(), req.userId, accountId, content.trim(), error.message);

    res.status(500).json({ error: 'Failed to post', details: error.message });
  }
});

// POST /api/x-publisher/schedule
router.post('/schedule', (req, res) => {
  const { accountId, content, scheduledAt, mode, ideaId } = req.body;
  if (!accountId) return res.status(400).json({ error: 'accountId is required' });
  if (!scheduledAt) return res.status(400).json({ error: 'scheduledAt is required' });

  const err = validateTweet(content);
  if (err) return res.status(400).json({ error: err });

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
    FROM x_posts p JOIN x_accounts a ON p.account_id = a.id
    WHERE p.user_id = ?
  `;
  const params = [req.userId];

  if (accountId) { query += ' AND p.account_id = ?'; params.push(accountId); }
  if (status) { query += ' AND p.status = ?'; params.push(status); }
  query += ' ORDER BY p.scheduled_at ASC, p.created_at DESC LIMIT 100';

  res.json({ success: true, posts: db.prepare(query).all(...params) });
});

// DELETE /api/x-publisher/queue/:id
router.delete('/queue/:id', (req, res) => {
  const db = getDB();
  const post = db.prepare('SELECT id, status FROM x_posts WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  if (post.status === 'published') return res.status(400).json({ error: 'Cannot cancel a published post' });
  db.prepare("UPDATE x_posts SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?").run(req.params.id);
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
    SELECT p.*, a.access_token, a.access_secret
    FROM x_posts p JOIN x_accounts a ON p.account_id = a.id
    WHERE p.id = ? AND p.user_id = ? AND p.status = 'failed'
  `).get(req.params.id, req.userId);
  if (!post) return res.status(404).json({ error: 'Failed post not found' });

  try {
    const tweet = await postTweet(post, post.content);
    db.prepare(`
      UPDATE x_posts SET status = 'published', posted_at = datetime('now'),
      tweet_id = ?, error_message = NULL, updated_at = datetime('now') WHERE id = ?
    `).run(tweet.id, post.id);
    res.json({ success: true, tweetId: tweet.id });
  } catch (error) {
    db.prepare("UPDATE x_posts SET error_message = ?, updated_at = datetime('now') WHERE id = ?").run(error.message, post.id);
    res.status(500).json({ error: 'Retry failed', details: error.message });
  }
});

// ─── AI DRAFTING ──────────────────────────────────────────────────────────────

// POST /api/x-publisher/draft
router.post('/draft', async (req, res) => {
  const { topic, tone } = req.body;
  if (!topic) return res.status(400).json({ error: 'Topic is required' });

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 200,
      system: 'You are a world-class Twitter/X copywriter. You write tweets that stop the scroll and drive engagement. Direct, conversational, authentic. No hashtags. No emojis unless they add real meaning.',
      messages: [{
        role: 'user',
        content: `Write a tweet about: "${topic}"
Tone: ${tone || 'direct, value-driven, conversational'}
Rules: Under 280 characters. No hashtags. Hook in the first line.
Return ONLY the tweet text. Nothing else.`
      }]
    });
    const draft = message.content[0].text.trim();
    res.json({ success: true, draft, characters: draft.length });
  } catch (error) {
    res.status(500).json({ error: 'Draft failed', details: error.message });
  }
});

// POST /api/x-publisher/enhance
router.post('/enhance', async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Content is required' });

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 200,
      system: 'You improve tweets. Stronger hook, tighter copy, more engaging. No hashtags. Stay under 280 chars.',
      messages: [{
        role: 'user',
        content: `Improve this tweet. Stay under 280 characters.\n\nORIGINAL:\n${content}\n\nReturn ONLY the improved tweet.`
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
    FROM x_autopilot ap JOIN x_accounts a ON ap.account_id = a.id
    WHERE ap.user_id = ?
  `).all(req.userId);
  res.json({ success: true, configs });
});

// POST /api/x-publisher/autopilot
router.post('/autopilot', (req, res) => {
  const { accountId, scheduleDays, scheduleTime, contentDirection, pillarId, timezone } = req.body;
  if (!accountId) return res.status(400).json({ error: 'accountId is required' });

  const db = getDB();
  const account = db.prepare('SELECT id FROM x_accounts WHERE id = ? AND user_id = ?').get(accountId, req.userId);
  if (!account) return res.status(404).json({ error: 'Account not found' });

  const existing = db.prepare('SELECT id FROM x_autopilot WHERE account_id = ? AND user_id = ?').get(accountId, req.userId);

  const days = JSON.stringify(scheduleDays || ['monday', 'wednesday', 'friday']);
  const time = scheduleTime || '09:00';
  const direction = contentDirection || '';
  const tz = timezone || 'America/Chicago';

  if (existing) {
    db.prepare(`
      UPDATE x_autopilot SET schedule_days=?, schedule_time=?, content_direction=?,
      pillar_id=?, timezone=?, updated_at=datetime('now')
      WHERE account_id=? AND user_id=?
    `).run(days, time, direction, pillarId || null, tz, accountId, req.userId);
  } else {
    db.prepare(`
      INSERT INTO x_autopilot (id, user_id, account_id, schedule_days, schedule_time, content_direction, pillar_id, timezone)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), req.userId, accountId, days, time, direction, pillarId || null, tz);
  }

  res.json({ success: true });
});

// POST /api/x-publisher/autopilot/toggle
router.post('/autopilot/toggle', (req, res) => {
  const { accountId, isActive } = req.body;
  if (!accountId) return res.status(400).json({ error: 'accountId is required' });
  const db = getDB();
  db.prepare(`
    UPDATE x_autopilot SET is_active=?, updated_at=datetime('now')
    WHERE account_id=? AND user_id=?
  `).run(isActive ? 1 : 0, accountId, req.userId);
  res.json({ success: true, isActive });
});

module.exports = router;
