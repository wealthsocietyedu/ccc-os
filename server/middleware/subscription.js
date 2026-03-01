// server/middleware/subscription.js
// Enforces tier access and video quota on protected routes
// Admins (is_admin = 1) bypass all checks and get Operator-level access

const { getDB } = require('../db');
const { getTierLimits, canAccessFeature } = require('../billing/config');

// ─── ADMIN CHECK HELPER ───────────────────────────────────────────────────────
const isAdmin = (userId) => {
  const db = getDB();
  const user = db.prepare('SELECT is_admin, tier FROM users WHERE id = ?').get(userId);
  return user?.is_admin === 1;
};

const requireSubscription = (req, res, next) => {
  // Admins always pass
  if (isAdmin(req.userId)) {
    req.userTier = 'operator';
    return next();
  }
  // Check env-level dev bypass
  if (process.env.BYPASS_BILLING === 'true') {
    req.userTier = 'operator';
    return next();
  }
  const db = getDB();
  const user = db.prepare('SELECT tier FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(401).json({ error: 'User not found' });
  if (!user.tier || user.tier === 'free') {
    return res.status(403).json({ error: 'subscription_required', message: 'An active subscription is required.', redirect: '/billing' });
  }
  req.userTier = user.tier;
  next();
};

const requireTier = (...tiers) => (req, res, next) => {
  if (isAdmin(req.userId) || process.env.BYPASS_BILLING === 'true') {
    req.userTier = 'operator';
    return next();
  }
  const db = getDB();
  const user = db.prepare('SELECT tier FROM users WHERE id = ?').get(req.userId);
  if (!tiers.includes(user?.tier)) {
    return res.status(403).json({ error: 'tier_required', message: `Requires: ${tiers.join(', ')} plan.`, required_tiers: tiers, current_tier: user?.tier || 'free', redirect: '/billing' });
  }
  req.userTier = user.tier;
  next();
};

const checkVideoQuota = (req, res, next) => {
  if (isAdmin(req.userId) || process.env.BYPASS_BILLING === 'true') {
    req.userTier = 'operator';
    req.videoQuotaRemaining = 9999;
    return next();
  }
  const db = getDB();
  const user = db.prepare('SELECT tier, videos_used_this_month, videos_reset_date FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(401).json({ error: 'User not found' });

  const tier = user.tier || 'starter';
  const limits = getTierLimits(tier);
  const monthlyLimit = limits.videos_per_month;

  if (user.videos_reset_date && new Date() > new Date(user.videos_reset_date)) {
    const nextReset = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare('UPDATE users SET videos_used_this_month = 0, videos_reset_date = ? WHERE id = ?').run(nextReset, req.userId);
    user.videos_used_this_month = 0;
  }

  const used = user.videos_used_this_month || 0;
  if (used >= monthlyLimit) {
    return res.status(429).json({
      error: 'video_limit_reached',
      message: `You've used all ${monthlyLimit} videos for this month.`,
      used, limit: monthlyLimit, reset_date: user.videos_reset_date,
      upgrade_message: tier === 'starter' ? 'Upgrade to Pro for 25 videos/month.' : 'Upgrade to Operator for 100 videos/month.',
      redirect: '/billing',
    });
  }

  req.userTier = tier;
  req.videoQuotaRemaining = monthlyLimit - used;
  next();
};

const incrementVideoUsage = (userId, count = 1) => {
  if (isAdmin(userId)) return; // Admins don't burn quota
  const db = getDB();
  const user = db.prepare('SELECT videos_reset_date FROM users WHERE id = ?').get(userId);
  if (!user.videos_reset_date) {
    db.prepare('UPDATE users SET videos_reset_date = ? WHERE id = ?').run(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), userId);
  }
  db.prepare("UPDATE users SET videos_used_this_month = COALESCE(videos_used_this_month, 0) + ?, updated_at = datetime('now') WHERE id = ?").run(count, userId);
};

const checkBrandLimit = (req, res, next) => {
  if (isAdmin(req.userId) || process.env.BYPASS_BILLING === 'true') return next();
  const db = getDB();
  const user = db.prepare('SELECT tier FROM users WHERE id = ?').get(req.userId);
  const limits = getTierLimits(user?.tier || 'starter');
  if (limits.brands === -1) return next();
  const { count } = db.prepare('SELECT COUNT(*) as count FROM brands WHERE user_id = ?').get(req.userId);
  if (count >= limits.brands) {
    return res.status(403).json({ error: 'brand_limit_reached', message: `Your ${user.tier} plan allows ${limits.brands} brand(s). Upgrade to add more.`, current: count, limit: limits.brands, redirect: '/billing' });
  }
  next();
};

const requireFeature = (feature) => (req, res, next) => {
  if (isAdmin(req.userId) || process.env.BYPASS_BILLING === 'true') {
    req.userTier = 'operator';
    return next();
  }
  const db = getDB();
  const user = db.prepare('SELECT tier FROM users WHERE id = ?').get(req.userId);
  const tier = user?.tier || 'starter';
  if (!canAccessFeature(tier, feature)) {
    return res.status(403).json({ error: 'feature_not_available', message: `Not available on ${tier} plan.`, feature, current_tier: tier, redirect: '/billing' });
  }
  req.userTier = tier;
  next();
};

module.exports = { requireSubscription, requireTier, checkVideoQuota, incrementVideoUsage, checkBrandLimit, requireFeature, isAdmin };
