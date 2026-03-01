// server/db/index.js
const Database = require('better-sqlite3');
const path = require('path');
const { initSchema } = require('./schema');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/ccc_os.db');

// Ensure data directory exists
const fs = require('fs');
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db;

const getDB = () => {
  if (!db) {
    db = new Database(DB_PATH);
    initSchema(db);
  }
  return db;
};

// ─── SEED DATA ────────────────────────────────────────────────────────────────
const seedUserData = (userId) => {
  const db = getDB();

  // Check if user already has data
  const existing = db.prepare('SELECT id FROM brands WHERE user_id = ?').get(userId);
  if (existing) return;

  const brandId = 'seed_brand_' + userId.slice(0, 8);
  const brand2Id = 'seed_brand2_' + userId.slice(0, 8);

  // Insert seed brands
  db.prepare(`
    INSERT INTO brands (id, user_id, name, type, platforms, niche, primary_offer, monthly_goal, color)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(brandId, userId, 'My Personal Brand', 'Personal Brand',
    JSON.stringify(['Instagram','TikTok','Twitter']),
    'Content Systems & Creator Business',
    'Content Command Center OS', 10000, '#6C47FF');

  // Seed pillars
  const pillars = [
    ['Systems & Workflow', 'Authority', 'Freedom', 'Link in Bio'],
    ['Content Psychology', 'Authority', 'Power', 'DM'],
    ['Creator Income', 'Desire', 'Freedom', 'Purchase'],
    ['Behind the Build', 'Trust', 'Social Approval', 'Follow'],
  ];

  const pillarIds = pillars.map((p, i) => {
    const id = `seed_pillar_${i}_${userId.slice(0,6)}`;
    db.prepare(`
      INSERT INTO pillars (id, user_id, brand_id, name, type, trigger, cta)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, brandId, p[0], p[1], p[2], p[3]);
    return id;
  });

  // Seed hooks
  const hooks = [
    ['Nobody builds a content business — they just post', 'Contrarian', 'Curiosity', 9.2, 'Winner'],
    ['I tried posting every day for 90 days. Here\'s what actually happened.', 'Story', 'Curiosity', 8.7, 'Winner'],
    ['The reason your content doesn\'t convert (it\'s not what you think)', 'Curiosity Gap', 'Curiosity', 8.1, 'Active'],
    ['Stop posting content. Start building a system.', 'Contrarian', 'Shock', 9.0, 'Winner'],
    ['From 0 to $10k/month with 3 posts per week — the exact framework', 'Social Proof', 'Desire', 8.5, 'Active'],
    ['Most creators are one system away from 10x growth', 'Bold Claim', 'Excitement', 7.8, 'Active'],
    ['I made $8,000 from a single thread. Here\'s the strategy.', 'Social Proof', 'Desire', 9.1, 'Winner'],
    ['What if your content could run on autopilot?', 'Question', 'Curiosity', 7.2, 'Active'],
  ];

  hooks.forEach((h, i) => {
    db.prepare(`
      INSERT INTO hooks (id, user_id, brand_id, text, type, emotion, score, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(`seed_hook_${i}_${userId.slice(0,6)}`, userId, brandId, h[0], h[1], h[2], h[3], h[4]);
  });

  // Seed assets with performance data
  const assets = [
    {
      title: 'The 6-module Notion OS that runs my content business',
      format: 'Short Form Video', platform: 'TikTok', status: 'Published',
      hook: 'Nobody builds a content business — they just post',
      cta: 'Link in bio', funnel_stage: 'TOFU', pillar: 0,
      published_date: '2025-02-10',
      perf: { views: 84200, likes: 3100, comments: 287, shares: 912, saves: 2400, followers: 340, leads: 47, decision: 'Scale' }
    },
    {
      title: 'The 7 life force triggers that make content stop scrolls',
      format: 'Carousel', platform: 'Instagram', status: 'Published',
      hook: 'Most creators post what they think people want to hear',
      cta: 'Save this', funnel_stage: 'TOFU', pillar: 1,
      published_date: '2025-02-12',
      perf: { views: 41800, likes: 2800, comments: 156, shares: 440, saves: 3200, followers: 210, leads: 22, decision: 'Scale' }
    },
    {
      title: 'How I reverse engineered $10k/mo to 4 posts per week',
      format: 'Thread', platform: 'Twitter', status: 'Published',
      hook: 'I\'ll show you the exact math',
      cta: 'DM \'calculator\'', funnel_stage: 'MOFU', pillar: 2,
      published_date: '2025-02-14',
      perf: { views: 29400, likes: 1900, comments: 341, shares: 780, saves: 890, followers: 190, leads: 68, decision: 'Scale' }
    },
    {
      title: 'Stop using Notion as a folder. Use it as an OS',
      format: 'Short Form Video', platform: 'TikTok', status: 'Published',
      hook: 'Your Notion workspace is failing you',
      cta: 'Link in bio', funnel_stage: 'TOFU', pillar: 0,
      published_date: '2025-02-16',
      perf: { views: 52300, likes: 2400, comments: 198, shares: 620, saves: 1800, followers: 280, leads: 31, decision: 'Scale' }
    },
    {
      title: 'Building a $50k digital product from a Notion template',
      format: 'Short Form Video', platform: 'Instagram', status: 'Published',
      hook: 'I built this in a weekend',
      cta: 'Follow for the build', funnel_stage: 'TOFU', pillar: 3,
      published_date: '2025-02-18',
      perf: { views: 38100, likes: 1700, comments: 224, shares: 390, saves: 1100, followers: 420, leads: 18, decision: 'Refine' }
    },
    {
      title: 'Why your hooks aren\'t working (it\'s not the hook)',
      format: 'Carousel', platform: 'Instagram', status: 'Scripted',
      hook: 'The problem isn\'t your hook. It\'s what comes after.',
      cta: 'Save for later', funnel_stage: 'TOFU', pillar: 1,
      published_date: null,
      perf: null
    },
    {
      title: 'The batch system I use to create 30 days of content in 6 hours',
      format: 'Short Form Video', platform: 'TikTok', status: 'Filming',
      hook: 'I don\'t create every day. I create one day and schedule everything.',
      cta: 'Link in bio', funnel_stage: 'TOFU', pillar: 0,
      published_date: null,
      perf: null
    },
    {
      title: '5 psychological triggers that make people buy without selling',
      format: 'Carousel', platform: 'Instagram', status: 'Scheduled',
      hook: 'The best salespeople never feel like salespeople',
      cta: 'Save this', funnel_stage: 'MOFU', pillar: 1,
      scheduled_date: '2025-02-23',
      published_date: null,
      perf: null
    },
    {
      title: 'The offer ladder that turned 1k followers into $8k',
      format: 'Thread', platform: 'Twitter', status: 'Idea',
      hook: 'Most creators have an audience. Few have a business.',
      cta: 'DM \'ladder\'', funnel_stage: 'BOFU', pillar: 2,
      published_date: null,
      perf: null
    },
  ];

  assets.forEach((a, i) => {
    const assetId = `seed_asset_${i}_${userId.slice(0,6)}`;
    db.prepare(`
      INSERT INTO assets (id, user_id, brand_id, pillar_id, title, format, platform, status, hook, cta, funnel_stage, scheduled_date, published_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      assetId, userId, brandId, pillarIds[a.pillar],
      a.title, a.format, a.platform, a.status,
      a.hook, a.cta, a.funnel_stage,
      a.scheduled_date || null, a.published_date || null
    );

    if (a.perf) {
      db.prepare(`
        INSERT INTO performance (id, user_id, asset_id, brand_id, platform, publish_date, views, likes, comments, shares, saves, followers, leads, decision)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `seed_perf_${i}_${userId.slice(0,6)}`, userId, assetId, brandId,
        a.platform, a.published_date,
        a.perf.views, a.perf.likes, a.perf.comments,
        a.perf.shares, a.perf.saves, a.perf.followers,
        a.perf.leads, a.perf.decision
      );
    }
  });

  // Seed platform stats
  const platforms = [
    ['TikTok', 5, 3, 12400, 14200, 48000],
    ['Instagram', 4, 2, 8900, 9800, 22000],
    ['Twitter', 3, 2, 5200, 5900, 18000],
  ];
  platforms.forEach((p, i) => {
    db.prepare(`
      INSERT INTO platform_stats (id, user_id, brand_id, platform, target_per_week, published_this_week, followers_start, followers_current, avg_views)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(`seed_ps_${i}_${userId.slice(0,6)}`, userId, brandId, p[0], p[1], p[2], p[3], p[4], p[5]);
  });

  // Seed offers
  const offers = [
    ['CCC OS — Starter', 'Low Ticket', 79, 3.2, 40],
    ['CCC OS — Pro', 'Mid Ticket', 249, 1.8, 15],
    ['CCC OS — Operator', 'High Ticket', 799, 0.9, 5],
  ];
  offers.forEach((o, i) => {
    db.prepare(`
      INSERT INTO offers (id, user_id, brand_id, name, type, price, conversion_rate, monthly_units_goal)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(`seed_offer_${i}_${userId.slice(0,6)}`, userId, brandId, o[0], o[1], o[2], o[3], o[4]);
  });

  // Seed campaign
  db.prepare(`
    INSERT INTO campaigns (id, user_id, brand_id, name, type, start_date, end_date, revenue_goal, leads_goal, pieces_planned, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(`seed_camp_${userId.slice(0,8)}`, userId, brandId,
    'CCC OS Launch — Feb 2025', 'Launch',
    '2025-02-01', '2025-02-28',
    15000, 200, 12, 'Active');

  // Seed funnel
  const funnelId = `seed_funnel_${userId.slice(0,8)}`;
  db.prepare(`
    INSERT INTO funnels (id, user_id, brand_id, name, stage, entry_point, micro_conversion, lead_capture, nurture_step, conversion_step)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(funnelId, userId, brandId,
    'Content → Lead → Sale',
    'TOFU',
    'Short Form Video / Carousel on TikTok & Instagram',
    'Follow or Save',
    'Free CCC OS Mini Guide (email opt-in)',
    '5-email welcome sequence + case studies',
    'CCC OS Sales Page → Checkout'
  );

  // Seed CTA routes
  const routes = [
    ['Link in Bio → Free Guide', 'Comment \'guide\' and I\'ll send it', 'https://yourdomain.com/free-guide', 'TOFU', 'TOFU'],
    ['DM Keyword → Sales Call', 'DM me \'ready\'', 'Direct Message', 'MOFU', 'MOFU'],
    ['Sales Page → CCC OS', 'Link in bio — grab the OS', 'https://yourdomain.com/ccc-os', 'BOFU', 'BOFU'],
  ];
  routes.forEach((r, i) => {
    db.prepare(`
      INSERT INTO cta_routes (id, user_id, brand_id, funnel_id, label, cta_copy, destination_url, funnel_stage)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(`seed_cta_${i}_${userId.slice(0,6)}`, userId, brandId, funnelId, r[0], r[1], r[2], r[4]);
  });

  // Seed ideas
  const ideas = [
    ['The 3-hour content batching system', 'Short Form Video', 'High', 'Approved'],
    ['How to make strangers trust you in 30 seconds', 'Carousel', 'High', 'Approved'],
    ['The math behind a $100k content business', 'Thread', 'Medium', 'Raw Idea'],
    ['Day in my life as a 7-figure digital creator', 'Short Form Video', 'Low', 'Someday'],
    ['Notion template vs custom-built OS: which wins', 'Carousel', 'Medium', 'Approved'],
  ];
  ideas.forEach((idea, i) => {
    db.prepare(`
      INSERT INTO ideas (id, user_id, brand_id, pillar_id, title, format, priority, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(`seed_idea_${i}_${userId.slice(0,6)}`, userId, brandId, pillarIds[i % pillarIds.length],
      idea[0], idea[1], idea[2], idea[3]);
  });

  console.log(`✅ Seed data created for user ${userId}`);
};

module.exports = { getDB, seedUserData };
