// server/scheduler/cron.js
// 5-minute cron job to publish queued posts on time

const cron = require('node-cron');
const { getDB } = require('../db');
const { publishPost } = require('./publish');
const { triggerRepurpose } = require('./repurpose');

function startCron() {
  console.log('[Cron] Scheduler started — checking for due posts every 5 minutes');

  cron.schedule('*/5 * * * *', async () => {
    const db = getDB();
    const due = db.prepare(
      `SELECT * FROM scheduled_posts WHERE status = 'queued' AND scheduled_at <= datetime('now')`
    ).all();

    if (due.length === 0) return;
    console.log(`[Cron] Found ${due.length} post(s) to publish`);

    for (const post of due) {
      try {
        // Mark as publishing to prevent double-publish
        db.prepare("UPDATE scheduled_posts SET status = 'publishing', updated_at = datetime('now') WHERE id = ? AND status = 'queued'").run(post.id);

        // Verify we got the lock (row might have been grabbed by another process)
        const locked = db.prepare("SELECT id FROM scheduled_posts WHERE id = ? AND status = 'publishing'").get(post.id);
        if (!locked) continue;

        const { status } = await publishPost(post, post.user_id);
        console.log(`[Cron] Published post "${post.title}" (${post.id}) — status: ${status}`);

        // Trigger repurpose engine if post published (fully or partially)
        if (status === 'published' || status === 'partial') {
          const published = db.prepare('SELECT * FROM scheduled_posts WHERE id = ?').get(post.id);
          triggerRepurpose(published, post.user_id).catch(err =>
            console.error(`[Cron] Repurpose trigger failed for ${post.id}:`, err.message)
          );
        }
      } catch (err) {
        console.error(`[Cron] Failed to publish post ${post.id}:`, err.message);
        db.prepare("UPDATE scheduled_posts SET status = 'failed', error_log = ?, updated_at = datetime('now') WHERE id = ?")
          .run(err.message || 'Unknown error', post.id);
      }
    }
  });
}

module.exports = { startCron };
