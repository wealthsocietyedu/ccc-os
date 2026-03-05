// server/scheduler/repurpose.js
// Repurpose engine — triggered after a post publishes successfully.
// Matches active repurpose_rules and creates derivative scheduled_posts.

const { v4: uuid } = require('uuid');
const { getDB } = require('../db');
const { adaptCaption } = require('./caption-adapter');

/**
 * Called by cron.js after a post publishes.
 * Finds matching repurpose rules and creates derivative posts.
 *
 * @param {object} post - The published scheduled_post row
 * @param {string} userId - The user who owns the post
 */
async function triggerRepurpose(post, userId) {
  const db = getDB();
  const openAiKey = process.env.OPENAI_API_KEY || '';

  let destinations;
  try {
    destinations = JSON.parse(post.destinations || '[]');
  } catch { destinations = []; }

  if (!destinations.length) return;

  // Find all active repurpose rules for this user where source_platform is in post's destinations
  const rules = db.prepare(`
    SELECT * FROM repurpose_rules
    WHERE user_id = ? AND active = 1 AND source_platform IN (${destinations.map(() => '?').join(',')})
  `).all(userId, ...destinations);

  if (!rules.length) return;
  console.log(`[Repurpose] Found ${rules.length} rule(s) to trigger for post "${post.title}"`);

  for (const rule of rules) {
    let destPlatforms;
    try {
      destPlatforms = JSON.parse(rule.dest_platforms || '[]');
    } catch { destPlatforms = []; }

    // Filter out destinations already in the original post (no duplicates)
    const newDests = destPlatforms.filter(d => !destinations.includes(d));
    if (!newDests.length) continue;

    // Calculate scheduled time: published_at + delay_hours
    const publishedAt = post.published_at ? new Date(post.published_at) : new Date();
    const scheduledAt = new Date(publishedAt.getTime() + rule.delay_hours * 60 * 60 * 1000);
    const scheduledAtISO = scheduledAt.toISOString().replace('T', ' ').slice(0, 19);

    // Adapt caption for each destination platform
    for (const destPlatform of newDests) {
      let adaptedCaption = post.caption || post.title || '';

      if (rule.adapt_captions) {
        try {
          adaptedCaption = await adaptCaption(
            post.caption || post.title || '',
            rule.source_platform,
            destPlatform,
            rule.caption_notes || '',
            openAiKey
          );
        } catch (err) {
          console.warn(`[Repurpose] Caption adaptation failed for ${destPlatform}: ${err.message}`);
          adaptedCaption = post.caption || post.title || '';
        }
      }

      // Create the derivative scheduled post
      const derivativeId = uuid();
      const title = `[Repurposed] ${post.title || 'Post'} → ${destPlatform}`;

      try {
        db.prepare(`
          INSERT INTO scheduled_posts
            (id, user_id, brand_id, title, caption, format, destinations, media_urls, scheduled_at, status, source_post_id, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'queued', ?, datetime('now'), datetime('now'))
        `).run(
          derivativeId,
          userId,
          post.brand_id || null,
          title,
          adaptedCaption,
          post.format || 'Short Form Video',
          JSON.stringify([destPlatform]),
          post.media_urls || '[]',
          scheduledAtISO,
          post.id // source_post_id
        );

        console.log(`[Repurpose] Created derivative post for ${destPlatform} scheduled at ${scheduledAtISO} (rule: ${rule.id})`);
      } catch (err) {
        console.error(`[Repurpose] Failed to create derivative for ${destPlatform}: ${err.message}`);
      }
    }
  }
}

module.exports = { triggerRepurpose };
