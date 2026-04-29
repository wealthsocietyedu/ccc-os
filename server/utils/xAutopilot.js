// server/utils/xAutopilot.js
// Autopilot engine — runs on cron, drafts and posts for active autopilot configs

const { v4: uuidv4 } = require('uuid');
const Anthropic = require('@anthropic-ai/sdk');
const { postTweet } = require('./xClient');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/**
 * Check if autopilot should fire for a given config right now
 */
function shouldFireNow(config) {
  try {
    const now = new Date();
    const days = JSON.parse(config.schedule_days);
    const currentDay = DAY_NAMES[now.getDay()];

    if (!days.includes(currentDay)) return false;

    // Check if current time matches schedule_time (within 5 min window)
    const [schedHour, schedMin] = config.schedule_time.split(':').map(Number);
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();

    const schedTotalMin = schedHour * 60 + schedMin;
    const currentTotalMin = currentHour * 60 + currentMin;

    // Fire if within 5 minute window
    if (Math.abs(currentTotalMin - schedTotalMin) > 5) return false;

    // Don't fire if already posted today
    if (config.last_posted_at) {
      const lastPosted = new Date(config.last_posted_at);
      const sameDay = lastPosted.toDateString() === now.toDateString();
      if (sameDay) return false;
    }

    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Generate a tweet for autopilot using Idea Vault first, fallback to direction
 */
async function generateAutopilotTweet(db, config) {
  // Try Idea Vault first
  let ideaId = null;
  let topic = null;

  if (config.pillar_id) {
    const idea = db.prepare(`
      SELECT id, title, hook_angle FROM ideas
      WHERE user_id = ? AND pillar_id = ? AND status = 'Raw Idea'
      ORDER BY RANDOM() LIMIT 1
    `).get(config.user_id, config.pillar_id);

    if (idea) {
      ideaId = idea.id;
      topic = idea.hook_angle || idea.title;
      // Mark idea as in-progress
      db.prepare('UPDATE ideas SET status = \'In Progress\' WHERE id = ?').run(idea.id);
    }
  }

  // If no pillar or no ideas found, try any raw idea
  if (!topic) {
    const idea = db.prepare(`
      SELECT id, title, hook_angle FROM ideas
      WHERE user_id = ? AND status = 'Raw Idea'
      ORDER BY RANDOM() LIMIT 1
    `).get(config.user_id);

    if (idea) {
      ideaId = idea.id;
      topic = idea.hook_angle || idea.title;
      db.prepare('UPDATE ideas SET status = \'In Progress\' WHERE id = ?').run(idea.id);
    }
  }

  // Fallback to content direction
  if (!topic && config.content_direction) {
    topic = config.content_direction;
  }

  if (!topic) {
    throw new Error('No ideas in vault and no content direction set. Add ideas or set a content direction.');
  }

  const message = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 200,
    system: 'You write high-performing tweets. Direct, valuable, authentic. No hashtags. No emojis unless meaningful. Hook in the first line. Under 280 characters.',
    messages: [{
      role: 'user',
      content: `Write a tweet based on this idea: "${topic}"
Content direction: ${config.content_direction || 'value-driven, educational, authentic'}
Return ONLY the tweet text. Under 280 characters.`
    }]
  });

  return {
    content: message.content[0].text.trim(),
    ideaId
  };
}

/**
 * Main autopilot runner — called from cron job
 */
async function runAutopilot(db) {
  const activeConfigs = db.prepare(`
    SELECT ap.*, a.api_key, a.api_secret, a.access_token, a.access_secret,
           a.display_name, a.username
    FROM x_autopilot ap
    JOIN x_accounts a ON ap.account_id = a.id
    WHERE ap.is_active = 1 AND a.is_active = 1
  `).all();

  for (const config of activeConfigs) {
    if (!shouldFireNow(config)) continue;

    try {
      const { content, ideaId } = await generateAutopilotTweet(db, config);

      // Post it
      const tweet = await postTweet(config, content);

      // Log to queue
      db.prepare(`
        INSERT INTO x_posts (id, user_id, account_id, content, mode, status, posted_at, tweet_id, idea_id)
        VALUES (?, ?, ?, ?, 'autopilot', 'published', datetime('now'), ?, ?)
      `).run(uuidv4(), config.user_id, config.account_id, content, tweet.id, ideaId || null);

      // Update last posted
      db.prepare('UPDATE x_autopilot SET last_posted_at = datetime(\'now\') WHERE id = ?').run(config.id);

      console.log(`[Autopilot] Posted for @${config.username} — tweet ${tweet.id}`);
    } catch (error) {
      console.error(`[Autopilot] Failed for account ${config.account_id}:`, error.message);

      // Log failure
      db.prepare(`
        INSERT INTO x_posts (id, user_id, account_id, content, mode, status, error_message)
        VALUES (?, ?, ?, 'Autopilot post failed', 'autopilot', 'failed', ?)
      `).run(uuidv4(), config.user_id, config.account_id, error.message);
    }
  }
}

/**
 * Scheduled posts runner — called from cron job
 * Finds all posts due to be published and fires them
 */
async function runScheduledPosts(db) {
  const duePosts = db.prepare(`
    SELECT p.*, a.api_key, a.api_secret, a.access_token, a.access_secret
    FROM x_posts p
    JOIN x_accounts a ON p.account_id = a.id
    WHERE p.status = 'scheduled'
      AND p.scheduled_at <= datetime('now')
      AND a.is_active = 1
    LIMIT 10
  `).all();

  for (const post of duePosts) {
    try {
      const tweet = await postTweet(post, post.content);

      db.prepare(`
        UPDATE x_posts SET status = 'published', posted_at = datetime('now'),
        tweet_id = ?, updated_at = datetime('now') WHERE id = ?
      `).run(tweet.id, post.id);

      console.log(`[Scheduler] Posted tweet ${tweet.id} for post ${post.id}`);
    } catch (error) {
      db.prepare(`
        UPDATE x_posts SET status = 'failed', error_message = ?, updated_at = datetime('now') WHERE id = ?
      `).run(error.message, post.id);

      console.error(`[Scheduler] Failed post ${post.id}:`, error.message);
    }
  }
}

module.exports = { runAutopilot, runScheduledPosts };
