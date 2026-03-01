// server/db/billing-schema.js
// Adds billing tables to existing schema
// Called from schema.js initSchema()

const initBillingSchema = (db) => {
  db.exec(`
    -- ─── ADD BILLING COLUMNS TO USERS ────────────────────────────────────────
    -- SQLite doesn't support ADD COLUMN IF NOT EXISTS, so we use try/catch in JS

    -- ─── SUBSCRIPTIONS ───────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS subscriptions (
      id                      TEXT PRIMARY KEY,
      user_id                 TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      tier                    TEXT NOT NULL DEFAULT 'starter',
      interval                TEXT NOT NULL DEFAULT 'monthly',
      status                  TEXT NOT NULL DEFAULT 'inactive',

      -- Stripe fields
      stripe_subscription_id  TEXT,
      stripe_price_id         TEXT,

      -- PayPal fields
      paypal_subscription_id  TEXT,

      -- Billing period
      current_period_start    TEXT,
      current_period_end      TEXT,
      cancel_at_period_end    INTEGER NOT NULL DEFAULT 0,

      created_at              TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at              TEXT NOT NULL DEFAULT (datetime('now')),

      UNIQUE(user_id)
    );

    -- ─── PAYMENT HISTORY ─────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS payment_history (
      id                  TEXT PRIMARY KEY,
      user_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider            TEXT NOT NULL DEFAULT 'stripe',
      amount              REAL NOT NULL DEFAULT 0,
      currency            TEXT NOT NULL DEFAULT 'USD',
      status              TEXT NOT NULL DEFAULT 'succeeded',
      provider_invoice_id TEXT,
      description         TEXT NOT NULL DEFAULT '',
      created_at          TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ─── INDEXES ─────────────────────────────────────────────────────────────
    CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_paypal ON subscriptions(paypal_subscription_id);
    CREATE INDEX IF NOT EXISTS idx_payment_history_user ON payment_history(user_id);
  `);

  // Add columns to users table (ignore errors if they already exist)
  const billingColumns = [
    'stripe_customer_id TEXT',
    'videos_used_this_month INTEGER NOT NULL DEFAULT 0',
    'videos_reset_date TEXT',
    'is_admin INTEGER NOT NULL DEFAULT 0',
  ];

  billingColumns.forEach(col => {
    try {
      db.exec(`ALTER TABLE users ADD COLUMN ${col}`);
    } catch (e) {
      // Column already exists — fine
    }
  });

  console.log('✅ Billing schema initialized');
};

module.exports = { initBillingSchema };
