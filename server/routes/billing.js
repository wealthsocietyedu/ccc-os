// server/routes/billing.js
// All billing endpoints — Stripe + PayPal

const express = require('express');
const { authenticate } = require('../middleware/auth');
const { getDB } = require('../db');
const { TIERS, getTierLimits } = require('../billing/config');
const stripeService = require('../billing/stripe');
const paypalService = require('../billing/paypal');

const router = express.Router();

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// ─── GET PRICING (public — no auth) ──────────────────────────────────────────
router.get('/pricing', (req, res) => {
  // Strip out internal price IDs — send only what the frontend needs
  const pricing = Object.entries(TIERS).map(([key, tier]) => ({
    id: key,
    name: tier.name,
    description: tier.description,
    badge: tier.badge,
    color: tier.color,
    monthly: { price: tier.monthly.price },
    annual: {
      price: tier.annual.price,
      monthlyEquivalent: tier.annual.monthlyEquivalent,
      savings: tier.monthly.price * 12 - tier.annual.price,
    },
    limits: tier.limits,
  }));
  res.json(pricing);
});

// ─── GET CURRENT SUBSCRIPTION ─────────────────────────────────────────────────
router.get('/subscription', authenticate, (req, res) => {
  const db = getDB();
  const user = db.prepare('SELECT tier, is_admin, videos_used_this_month, videos_reset_date FROM users WHERE id = ?').get(req.userId);

  // Admins get full Operator access, no billing required
  if (user?.is_admin || process.env.BYPASS_BILLING === 'true') {
    const { getTierLimits } = require('../billing/config');
    return res.json({
      active: true,
      tier: 'operator',
      interval: 'admin',
      status: 'active',
      is_admin: true,
      cancel_at_period_end: false,
      current_period_end: null,
      provider: 'none',
      usage: { videos_used: 0, videos_limit: 9999, videos_percent: 0, reset_date: null },
      limits: getTierLimits('operator'),
    });
  }

  const sub = db.prepare('SELECT * FROM subscriptions WHERE user_id = ?').get(req.userId);

  if (!sub) {
    return res.json({
      active: false,
      tier: 'free',
      message: 'No active subscription',
    });
  }

  const tierLimits = getTierLimits(sub.tier);
  const videosUsed = user?.videos_used_this_month || 0;
  const videosLimit = tierLimits.videos_per_month;
  const videosPercent = Math.round((videosUsed / videosLimit) * 100);

  res.json({
    active: sub.status === 'active',
    tier: sub.tier,
    interval: sub.interval,
    status: sub.status,
    cancel_at_period_end: !!sub.cancel_at_period_end,
    current_period_end: sub.current_period_end,
    provider: sub.stripe_subscription_id ? 'stripe' : 'paypal',
    usage: {
      videos_used: videosUsed,
      videos_limit: videosLimit,
      videos_percent: videosPercent,
      reset_date: user?.videos_reset_date,
    },
    limits: tierLimits,
  });
});

// ─── GET PAYMENT HISTORY ──────────────────────────────────────────────────────
router.get('/history', authenticate, (req, res) => {
  const db = getDB();
  const history = db.prepare(`
    SELECT * FROM payment_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 24
  `).all(req.userId);
  res.json(history);
});

// ─── STRIPE CHECKOUT ──────────────────────────────────────────────────────────
router.post('/stripe/checkout', authenticate, async (req, res) => {
  try {
    const { tier, interval } = req.body;
    if (!tier || !interval) return res.status(400).json({ error: 'tier and interval are required' });
    if (!TIERS[tier]) return res.status(400).json({ error: 'Invalid tier' });
    if (!['monthly', 'annual'].includes(interval)) return res.status(400).json({ error: 'Invalid interval' });

    const session = await stripeService.createCheckoutSession({
      userId: req.userId,
      tier,
      interval,
      successUrl: `${CLIENT_URL}/?billing=success&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${CLIENT_URL}/?billing=canceled`,
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── STRIPE CUSTOMER PORTAL ───────────────────────────────────────────────────
router.post('/stripe/portal', authenticate, async (req, res) => {
  try {
    const session = await stripeService.createPortalSession(
      req.userId,
      `${CLIENT_URL}/settings/billing`
    );
    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe portal error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── STRIPE WEBHOOK (no auth — Stripe calls this directly) ───────────────────
router.post('/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    try {
      const signature = req.headers['stripe-signature'];
      const result = await stripeService.handleStripeWebhook(req.body, signature);
      res.json(result);
    } catch (err) {
      console.error('Stripe webhook error:', err.message);
      res.status(400).json({ error: err.message });
    }
  }
);

// ─── PAYPAL CHECKOUT ──────────────────────────────────────────────────────────
router.post('/paypal/checkout', authenticate, async (req, res) => {
  try {
    const { tier, interval } = req.body;
    if (!tier || !interval) return res.status(400).json({ error: 'tier and interval are required' });

    const db = getDB();
    const user = db.prepare('SELECT email, name FROM users WHERE id = ?').get(req.userId);

    const result = await paypalService.createPayPalSubscription({
      userId: req.userId,
      tier,
      interval,
      successUrl: `${CLIENT_URL}/?billing=paypal-success`,
      cancelUrl: `${CLIENT_URL}/?billing=canceled`,
    });

    res.json(result);
  } catch (err) {
    console.error('PayPal checkout error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── PAYPAL SUCCESS (after customer approves on PayPal) ───────────────────────
router.post('/paypal/activate', authenticate, async (req, res) => {
  try {
    const { subscriptionId } = req.body;
    if (!subscriptionId) return res.status(400).json({ error: 'subscriptionId is required' });
    const result = await paypalService.activatePayPalSubscription(subscriptionId, req.userId);
    res.json(result);
  } catch (err) {
    console.error('PayPal activation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── PAYPAL WEBHOOK (no auth — PayPal calls this directly) ───────────────────
router.post('/webhooks/paypal', async (req, res) => {
  try {
    const result = await paypalService.handlePayPalWebhook(req.body, req.headers);
    res.json(result);
  } catch (err) {
    console.error('PayPal webhook error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// ─── CANCEL SUBSCRIPTION ──────────────────────────────────────────────────────
router.post('/cancel', authenticate, async (req, res) => {
  try {
    const db = getDB();
    const sub = db.prepare('SELECT * FROM subscriptions WHERE user_id = ?').get(req.userId);
    if (!sub) return res.status(404).json({ error: 'No active subscription found' });

    let result;
    if (sub.stripe_subscription_id) {
      result = await stripeService.cancelSubscription(req.userId);
    } else if (sub.paypal_subscription_id) {
      result = await paypalService.cancelPayPalSubscription(req.userId);
    } else {
      return res.status(400).json({ error: 'No payment provider found for this subscription' });
    }

    res.json(result);
  } catch (err) {
    console.error('Cancel error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
