// server/db/schema.js
// SQLite schema — Content Command Center OS
// All tables scoped to user_id for multi-user support

const initSchema = (db) => {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    -- ─── USERS ──────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS users (
      id          TEXT PRIMARY KEY,
      email       TEXT UNIQUE NOT NULL,
      password    TEXT NOT NULL,
      name        TEXT NOT NULL DEFAULT '',
      tier        TEXT NOT NULL DEFAULT 'starter',
      is_admin    INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ─── BRANDS ─────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS brands (
      id             TEXT PRIMARY KEY,
      user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name           TEXT NOT NULL,
      type           TEXT NOT NULL DEFAULT 'Personal Brand',
      platforms      TEXT NOT NULL DEFAULT '[]',
      niche          TEXT NOT NULL DEFAULT '',
      dream_customer TEXT NOT NULL DEFAULT '',
      voice_tone     TEXT NOT NULL DEFAULT 'Direct',
      primary_offer  TEXT NOT NULL DEFAULT '',
      monthly_goal   REAL NOT NULL DEFAULT 0,
      active         INTEGER NOT NULL DEFAULT 1,
      color          TEXT NOT NULL DEFAULT '#6C47FF',
      notes          TEXT NOT NULL DEFAULT '',
      created_at     TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ─── CONTENT PILLARS ─────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS pillars (
      id            TEXT PRIMARY KEY,
      user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      brand_id      TEXT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
      name          TEXT NOT NULL,
      type          TEXT NOT NULL DEFAULT 'Authority',
      trigger       TEXT NOT NULL DEFAULT 'Freedom',
      dream_outcome TEXT NOT NULL DEFAULT '',
      persuasion    TEXT NOT NULL DEFAULT '',
      cta           TEXT NOT NULL DEFAULT 'Follow',
      notes         TEXT NOT NULL DEFAULT '',
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ─── CONTENT ASSETS ──────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS assets (
      id              TEXT PRIMARY KEY,
      user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      brand_id        TEXT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
      pillar_id       TEXT REFERENCES pillars(id) ON DELETE SET NULL,
      title           TEXT NOT NULL,
      format          TEXT NOT NULL DEFAULT 'Short Form Video',
      platform        TEXT NOT NULL DEFAULT 'TikTok',
      status          TEXT NOT NULL DEFAULT 'Idea',
      hook            TEXT NOT NULL DEFAULT '',
      script          TEXT NOT NULL DEFAULT '',
      cta             TEXT NOT NULL DEFAULT '',
      cta_destination TEXT NOT NULL DEFAULT 'Follow',
      funnel_stage    TEXT NOT NULL DEFAULT 'TOFU',
      trigger         TEXT NOT NULL DEFAULT '',
      persuasion      TEXT NOT NULL DEFAULT '',
      scheduled_date  TEXT,
      published_date  TEXT,
      batch_group     TEXT NOT NULL DEFAULT '',
      assigned_to     TEXT NOT NULL DEFAULT '',
      repurpose_status TEXT NOT NULL DEFAULT 'Not Started',
      decision        TEXT,
      created_at      TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ─── PERFORMANCE TRACKER ─────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS performance (
      id           TEXT PRIMARY KEY,
      user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      asset_id     TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
      brand_id     TEXT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
      platform     TEXT NOT NULL DEFAULT '',
      publish_date TEXT NOT NULL DEFAULT (date('now')),
      views        INTEGER NOT NULL DEFAULT 0,
      reach        INTEGER NOT NULL DEFAULT 0,
      likes        INTEGER NOT NULL DEFAULT 0,
      comments     INTEGER NOT NULL DEFAULT 0,
      shares       INTEGER NOT NULL DEFAULT 0,
      saves        INTEGER NOT NULL DEFAULT 0,
      followers    INTEGER NOT NULL DEFAULT 0,
      link_clicks  INTEGER NOT NULL DEFAULT 0,
      leads        INTEGER NOT NULL DEFAULT 0,
      revenue      REAL NOT NULL DEFAULT 0,
      decision     TEXT,
      notes        TEXT NOT NULL DEFAULT '',
      created_at   TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ─── HOOK LIBRARY ────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS hooks (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      brand_id   TEXT REFERENCES brands(id) ON DELETE SET NULL,
      text       TEXT NOT NULL,
      type       TEXT NOT NULL DEFAULT 'Curiosity Gap',
      platform   TEXT NOT NULL DEFAULT '[]',
      emotion    TEXT NOT NULL DEFAULT 'Curiosity',
      trigger    TEXT NOT NULL DEFAULT '',
      score      REAL NOT NULL DEFAULT 0,
      times_used INTEGER NOT NULL DEFAULT 0,
      status     TEXT NOT NULL DEFAULT 'Untested',
      source     TEXT NOT NULL DEFAULT 'Original',
      notes      TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ─── IDEA VAULT ──────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS ideas (
      id            TEXT PRIMARY KEY,
      user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      brand_id      TEXT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
      pillar_id     TEXT REFERENCES pillars(id) ON DELETE SET NULL,
      title         TEXT NOT NULL,
      format        TEXT NOT NULL DEFAULT 'Short Form Video',
      platform      TEXT NOT NULL DEFAULT '[]',
      hook_angle    TEXT NOT NULL DEFAULT '',
      trigger       TEXT NOT NULL DEFAULT '',
      cta           TEXT NOT NULL DEFAULT 'Follow',
      status        TEXT NOT NULL DEFAULT 'Raw Idea',
      priority      TEXT NOT NULL DEFAULT 'Medium',
      source        TEXT NOT NULL DEFAULT 'Original',
      date_captured TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ─── FUNNEL MAP ──────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS funnels (
      id              TEXT PRIMARY KEY,
      user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      brand_id        TEXT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
      name            TEXT NOT NULL,
      stage           TEXT NOT NULL DEFAULT 'TOFU',
      entry_point     TEXT NOT NULL DEFAULT '',
      micro_conversion TEXT NOT NULL DEFAULT '',
      lead_capture    TEXT NOT NULL DEFAULT '',
      nurture_step    TEXT NOT NULL DEFAULT '',
      conversion_step TEXT NOT NULL DEFAULT '',
      active          INTEGER NOT NULL DEFAULT 1,
      notes           TEXT NOT NULL DEFAULT '',
      created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ─── CTA ROUTING ─────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS cta_routes (
      id              TEXT PRIMARY KEY,
      user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      brand_id        TEXT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
      funnel_id       TEXT REFERENCES funnels(id) ON DELETE SET NULL,
      label           TEXT NOT NULL,
      cta_copy        TEXT NOT NULL DEFAULT '',
      destination_url TEXT NOT NULL DEFAULT '',
      funnel_stage    TEXT NOT NULL DEFAULT 'TOFU',
      platform        TEXT NOT NULL DEFAULT '[]',
      active          INTEGER NOT NULL DEFAULT 1,
      monthly_clicks  INTEGER NOT NULL DEFAULT 0,
      conversion_rate REAL NOT NULL DEFAULT 0,
      notes           TEXT NOT NULL DEFAULT '',
      created_at      TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ─── PLATFORM STATS ──────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS platform_stats (
      id                 TEXT PRIMARY KEY,
      user_id            TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      brand_id           TEXT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
      platform           TEXT NOT NULL,
      target_per_week    INTEGER NOT NULL DEFAULT 5,
      published_this_week INTEGER NOT NULL DEFAULT 0,
      followers_start    INTEGER NOT NULL DEFAULT 0,
      followers_current  INTEGER NOT NULL DEFAULT 0,
      avg_views          INTEGER NOT NULL DEFAULT 0,
      best_format        TEXT NOT NULL DEFAULT '',
      notes              TEXT NOT NULL DEFAULT '',
      updated_at         TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(brand_id, platform)
    );

    -- ─── OFFERS ──────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS offers (
      id                TEXT PRIMARY KEY,
      user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      brand_id          TEXT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
      name              TEXT NOT NULL,
      type              TEXT NOT NULL DEFAULT 'Core Offer',
      price             REAL NOT NULL DEFAULT 0,
      conversion_rate   REAL NOT NULL DEFAULT 2,
      monthly_units_goal INTEGER NOT NULL DEFAULT 10,
      active            INTEGER NOT NULL DEFAULT 1,
      sales_page_url    TEXT NOT NULL DEFAULT '',
      notes             TEXT NOT NULL DEFAULT '',
      created_at        TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ─── CAMPAIGNS ───────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS campaigns (
      id           TEXT PRIMARY KEY,
      user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      brand_id     TEXT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
      offer_id     TEXT REFERENCES offers(id) ON DELETE SET NULL,
      name         TEXT NOT NULL,
      type         TEXT NOT NULL DEFAULT 'Launch',
      start_date   TEXT NOT NULL,
      end_date     TEXT NOT NULL,
      revenue_goal REAL NOT NULL DEFAULT 0,
      leads_goal   INTEGER NOT NULL DEFAULT 0,
      pieces_planned INTEGER NOT NULL DEFAULT 0,
      leads_actual INTEGER NOT NULL DEFAULT 0,
      status       TEXT NOT NULL DEFAULT 'Planning',
      notes        TEXT NOT NULL DEFAULT '',
      created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ─── WEEKLY REVIEWS ──────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS weekly_reviews (
      id             TEXT PRIMARY KEY,
      user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      brand_id       TEXT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
      week_date      TEXT NOT NULL,
      posts_published INTEGER NOT NULL DEFAULT 0,
      posts_goal     INTEGER NOT NULL DEFAULT 0,
      total_views    INTEGER NOT NULL DEFAULT 0,
      new_followers  INTEGER NOT NULL DEFAULT 0,
      leads_generated INTEGER NOT NULL DEFAULT 0,
      revenue        REAL NOT NULL DEFAULT 0,
      top_performers TEXT NOT NULL DEFAULT '[]',
      bottom_performers TEXT NOT NULL DEFAULT '[]',
      best_hook_type TEXT NOT NULL DEFAULT '',
      best_pillar    TEXT NOT NULL DEFAULT '',
      best_platform  TEXT NOT NULL DEFAULT '',
      scale_decisions TEXT NOT NULL DEFAULT '[]',
      refine_decisions TEXT NOT NULL DEFAULT '[]',
      kill_decisions TEXT NOT NULL DEFAULT '[]',
      next_week_plan TEXT NOT NULL DEFAULT '',
      created_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ─── PLATFORM CONNECTIONS ─────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS platform_connections (
      id            TEXT PRIMARY KEY,
      user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      platform      TEXT NOT NULL,
      handle        TEXT NOT NULL DEFAULT '',
      access_token  TEXT NOT NULL DEFAULT '',
      refresh_token TEXT NOT NULL DEFAULT '',
      token_expires TEXT,
      connected     INTEGER NOT NULL DEFAULT 0,
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, platform, handle)
    );

    -- ─── SCHEDULED POSTS ─────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS scheduled_posts (
      id              TEXT PRIMARY KEY,
      user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      brand_id        TEXT REFERENCES brands(id) ON DELETE CASCADE,
      title           TEXT NOT NULL DEFAULT '',
      caption         TEXT NOT NULL DEFAULT '',
      format          TEXT NOT NULL DEFAULT 'Short Form Video',
      destinations    TEXT NOT NULL DEFAULT '[]',
      media_urls      TEXT NOT NULL DEFAULT '[]',
      scheduled_at    TEXT NOT NULL,
      status          TEXT NOT NULL DEFAULT 'queued',
      published_at    TEXT,
      error_log       TEXT NOT NULL DEFAULT '',
      source_post_id  TEXT,
      created_at      TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ─── REPURPOSE RULES ──────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS repurpose_rules (
      id              TEXT PRIMARY KEY,
      user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      brand_id        TEXT REFERENCES brands(id) ON DELETE SET NULL,
      source_platform TEXT NOT NULL,
      dest_platforms  TEXT NOT NULL DEFAULT '[]',
      delay_hours     INTEGER NOT NULL DEFAULT 2,
      adapt_captions  INTEGER NOT NULL DEFAULT 1,
      caption_notes   TEXT NOT NULL DEFAULT '',
      active          INTEGER NOT NULL DEFAULT 1,
      created_at      TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_repurpose_rules_user ON repurpose_rules(user_id);
    CREATE INDEX IF NOT EXISTS idx_repurpose_rules_src  ON repurpose_rules(source_platform);

    -- ─── DISTRIBUTION WORKFLOWS ───────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS distribution_workflows (
      id              TEXT PRIMARY KEY,
      user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      brand_id        TEXT REFERENCES brands(id) ON DELETE CASCADE,
      source_platform TEXT NOT NULL,
      destinations    TEXT NOT NULL DEFAULT '[]',
      label           TEXT NOT NULL DEFAULT '',
      active          INTEGER NOT NULL DEFAULT 1,
      created_at      TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ─── PUBLISH LOG ─────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS publish_log (
      id            TEXT PRIMARY KEY,
      user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      brand_id      TEXT REFERENCES brands(id) ON DELETE CASCADE,
      post_id       TEXT REFERENCES scheduled_posts(id) ON DELETE SET NULL,
      platform      TEXT NOT NULL,
      status        TEXT NOT NULL DEFAULT 'success',
      platform_post_id TEXT,
      error_msg     TEXT,
      published_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ─── INDEXES ─────────────────────────────────────────────────────────────
    CREATE INDEX IF NOT EXISTS idx_platform_conn_user ON platform_connections(user_id);
    CREATE INDEX IF NOT EXISTS idx_scheduled_posts_user ON scheduled_posts(user_id);
    CREATE INDEX IF NOT EXISTS idx_scheduled_posts_brand ON scheduled_posts(brand_id);
    CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status ON scheduled_posts(status);
    CREATE INDEX IF NOT EXISTS idx_scheduled_posts_time ON scheduled_posts(scheduled_at);
    CREATE INDEX IF NOT EXISTS idx_workflows_user ON distribution_workflows(user_id);
    CREATE INDEX IF NOT EXISTS idx_publish_log_user ON publish_log(user_id);
    CREATE INDEX IF NOT EXISTS idx_brands_user ON brands(user_id);
    CREATE INDEX IF NOT EXISTS idx_pillars_brand ON pillars(brand_id);
    CREATE INDEX IF NOT EXISTS idx_assets_brand ON assets(brand_id);
    CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
    CREATE INDEX IF NOT EXISTS idx_performance_asset ON performance(asset_id);
    CREATE INDEX IF NOT EXISTS idx_performance_brand ON performance(brand_id);
    CREATE INDEX IF NOT EXISTS idx_hooks_user ON hooks(user_id);
    CREATE INDEX IF NOT EXISTS idx_ideas_brand ON ideas(brand_id);
    CREATE INDEX IF NOT EXISTS idx_funnels_brand ON funnels(brand_id);
    CREATE INDEX IF NOT EXISTS idx_cta_routes_brand ON cta_routes(brand_id);
    CREATE INDEX IF NOT EXISTS idx_platform_stats_brand ON platform_stats(brand_id);
    CREATE INDEX IF NOT EXISTS idx_offers_brand ON offers(brand_id);
    CREATE INDEX IF NOT EXISTS idx_campaigns_brand ON campaigns(brand_id);
    CREATE INDEX IF NOT EXISTS idx_weekly_reviews_brand ON weekly_reviews(brand_id);

    -- ─── REPURPOSED CONTENT ───────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS repurposed_content (
      id                TEXT PRIMARY KEY,
      user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      brand_id          TEXT REFERENCES brands(id) ON DELETE CASCADE,
      source_asset_id   TEXT REFERENCES assets(id) ON DELETE CASCADE,
      target_platform   TEXT NOT NULL,
      target_format     TEXT NOT NULL DEFAULT 'Short Form Video',
      status            TEXT NOT NULL DEFAULT 'Planned',
      notes             TEXT NOT NULL DEFAULT '',
      created_at        TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_repurposed_asset ON repurposed_content(source_asset_id);
    CREATE INDEX IF NOT EXISTS idx_repurposed_user ON repurposed_content(user_id);

    -- ─── BRAND DEALS ─────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS brand_deals (
      id            TEXT PRIMARY KEY,
      user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      brand_id      TEXT REFERENCES brands(id) ON DELETE CASCADE,
      partner_name  TEXT NOT NULL DEFAULT '',
      deal_type     TEXT NOT NULL DEFAULT 'Paid',
      amount        REAL NOT NULL DEFAULT 0,
      status        TEXT NOT NULL DEFAULT 'Inbound',
      deliverables  TEXT NOT NULL DEFAULT '',
      deadline      TEXT,
      notes         TEXT NOT NULL DEFAULT '',
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_brand_deals_user ON brand_deals(user_id);
    CREATE INDEX IF NOT EXISTS idx_brand_deals_brand ON brand_deals(brand_id);

    -- ─── ADVISOR MEMORY ───────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS advisor_memory (
      id           TEXT PRIMARY KEY,
      user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      memory_type  TEXT NOT NULL DEFAULT 'general',
      content      TEXT NOT NULL,
      metadata     TEXT NOT NULL DEFAULT '{}',
      created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_advisor_memory_user ON advisor_memory(user_id);
    CREATE INDEX IF NOT EXISTS idx_advisor_memory_type ON advisor_memory(memory_type);

    -- ─── ADVISOR CONVERSATIONS ────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS advisor_conversations (
      id           TEXT PRIMARY KEY,
      user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      session_type TEXT NOT NULL DEFAULT 'chat',
      messages     TEXT NOT NULL DEFAULT '[]',
      summary      TEXT NOT NULL DEFAULT '',
      brand_id     TEXT REFERENCES brands(id) ON DELETE SET NULL,
      created_at   TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_advisor_convos_user ON advisor_conversations(user_id);
    CREATE INDEX IF NOT EXISTS idx_advisor_convos_brand ON advisor_conversations(brand_id);

    -- ─── X ACCOUNTS ──────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS x_accounts (
      id              TEXT PRIMARY KEY,
      user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      display_name    TEXT NOT NULL DEFAULT '',
      username        TEXT NOT NULL DEFAULT '',
      api_key         TEXT NOT NULL,
      api_secret      TEXT NOT NULL,
      access_token    TEXT NOT NULL,
      access_secret   TEXT NOT NULL,
      is_active       INTEGER NOT NULL DEFAULT 1,
      slot            INTEGER NOT NULL DEFAULT 1,
      created_at      TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ─── X POST QUEUE ─────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS x_posts (
      id              TEXT PRIMARY KEY,
      user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      account_id      TEXT NOT NULL REFERENCES x_accounts(id) ON DELETE CASCADE,
      content         TEXT NOT NULL,
      mode            TEXT NOT NULL DEFAULT 'manual',
      status          TEXT NOT NULL DEFAULT 'draft',
      scheduled_at    TEXT,
      posted_at       TEXT,
      tweet_id        TEXT,
      error_message   TEXT,
      idea_id         TEXT REFERENCES ideas(id) ON DELETE SET NULL,
      created_at      TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ─── X AUTOPILOT CONFIG ───────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS x_autopilot (
      id              TEXT PRIMARY KEY,
      user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      account_id      TEXT NOT NULL REFERENCES x_accounts(id) ON DELETE CASCADE,
      is_active       INTEGER NOT NULL DEFAULT 0,
      schedule_days   TEXT NOT NULL DEFAULT '["monday","wednesday","friday"]',
      schedule_time   TEXT NOT NULL DEFAULT '09:00',
      content_direction TEXT NOT NULL DEFAULT '',
      pillar_id       TEXT REFERENCES pillars(id) ON DELETE SET NULL,
      timezone        TEXT NOT NULL DEFAULT 'America/Chicago',
      last_posted_at  TEXT,
      created_at      TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(account_id)
    );
  `);

  console.log('✅ Database schema initialized');

  // Init billing tables
  const { initBillingSchema } = require('./billing-schema');
  initBillingSchema(db);
};

module.exports = { initSchema };
