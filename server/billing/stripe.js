// server/billing/stripe.js
// Stripe integration — subscriptions, webhooks, customer portal

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { getDB } = require('../db');
const { TIERS } = require('./config');

// ─── CREATE STRIPE CUSTOMER ───────────────────────────────────────────────────
const createStripeCustomer = async (userId, email, name) => {
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: { ccc_user_id: userId },
  });
  // Save stripe customer id to user record
  const db = getDB();
  db.prepare('UPDATE users SET stripe_customer_id = ? WHERE id = ?').run(customer.id, userId);
  return customer;
};

// ─── GET OR CREATE CUSTOMER ───────────────────────────────────────────────────
const getOrCreateStripeCustomer = async (userId) => {
  const db = getDB();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (user.stripe_customer_id) {
    return await stripe.customers.retrieve(user.stripe_customer_id);
  }
  return await createStripeCustomer(userId, user.email, user.name);
};

// ─── CREATE CHECKOUT SESSION ─────────────────────────────────────────────────
// Called when customer clicks "Subscribe" on pricing page
const createCheckoutSession = async ({ userId, tier, interval, successUrl, cancelUrl }) => {
  const customer = await getOrCreateStripeCustomer(userId);
  const tierConfig = TIERS[tier];
  if (!tierConfig) throw new Error(`Invalid tier: ${tier}`);

  const priceId = interval === 'annual'
    ? tierConfig.annual.priceId
    : tierConfig.monthly.priceId;

  if (!priceId) throw new Error(`Price ID not configured for ${tier} ${interval}. Set it in your .env file.`);

  const session = await stripe.checkout.sessions.create({
    customer: customer.id,
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    subscription_data: {
      metadata: {
        ccc_user_id: userId,
        tier,
        interval,
      },
    },
    metadata: { ccc_user_id: userId, tier, interval },
    allow_promotion_codes: true,
  });

  return session;
};

// ─── CREATE CUSTOMER PORTAL SESSION ──────────────────────────────────────────
// Let customer manage their own subscription (upgrade, downgrade, cancel, invoices)
const createPortalSession = async (userId, returnUrl) => {
  const customer = await getOrCreateStripeCustomer(userId);
  const session = await stripe.billingPortal.sessions.create({
    customer: customer.id,
    return_url: returnUrl,
  });
  return session;
};

// ─── HANDLE STRIPE WEBHOOKS ───────────────────────────────────────────────────
// Stripe sends events to /api/billing/webhooks/stripe
// These update your DB based on what Stripe tells you happened
const handleStripeWebhook = async (rawBody, signature) => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    throw new Error(`Webhook signature verification failed: ${err.message}`);
  }

  const db = getDB();

  switch (event.type) {

    // ── Subscription created or updated ──────────────────────────────────────
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object;
      const userId = sub.metadata.ccc_user_id;
      const tier = sub.metadata.tier || 'starter';
      const interval = sub.metadata.interval || 'monthly';

      if (!userId) break;

      // Map Stripe status to our status
      const status = sub.status === 'active' ? 'active'
        : sub.status === 'past_due' ? 'past_due'
        : sub.status === 'canceled' ? 'canceled'
        : 'inactive';

      const existing = db.prepare('SELECT * FROM subscriptions WHERE user_id = ?').get(userId);

      if (existing) {
        db.prepare(`
          UPDATE subscriptions SET
            tier = ?, interval = ?, status = ?,
            stripe_subscription_id = ?, stripe_price_id = ?,
            current_period_start = ?, current_period_end = ?,
            cancel_at_period_end = ?, updated_at = datetime('now')
          WHERE user_id = ?
        `).run(
          tier, interval, status,
          sub.id, sub.items.data[0]?.price?.id || '',
          new Date(sub.current_period_start * 1000).toISOString(),
          new Date(sub.current_period_end * 1000).toISOString(),
          sub.cancel_at_period_end ? 1 : 0,
          userId
        );
      } else {
        const { v4: uuidv4 } = require('uuid');
        db.prepare(`
          INSERT INTO subscriptions (id, user_id, tier, interval, status, stripe_subscription_id, stripe_price_id, current_period_start, current_period_end, cancel_at_period_end)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          uuidv4(), userId, tier, interval, status,
          sub.id, sub.items.data[0]?.price?.id || '',
          new Date(sub.current_period_start * 1000).toISOString(),
          new Date(sub.current_period_end * 1000).toISOString(),
          sub.cancel_at_period_end ? 1 : 0
        );
      }

      // Update user tier
      db.prepare('UPDATE users SET tier = ?, updated_at = datetime(\'now\') WHERE id = ?').run(tier, userId);

      // Reset AI usage counter on renewal
      if (event.type === 'customer.subscription.updated') {
        const oldSub = event.data.previous_attributes;
        if (oldSub?.current_period_start) {
          db.prepare('UPDATE users SET ai_usage_this_month = 0, ai_usage_reset_date = ? WHERE id = ?')
            .run(new Date(sub.current_period_end * 1000).toISOString(), userId);
        }
      }
      break;
    }

    // ── Subscription canceled ─────────────────────────────────────────────────
    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      const userId = sub.metadata.ccc_user_id;
      if (!userId) break;
      db.prepare(`UPDATE subscriptions SET status = 'canceled', updated_at = datetime('now') WHERE user_id = ?`).run(userId);
      db.prepare(`UPDATE users SET tier = 'free', updated_at = datetime('now') WHERE id = ?`).run(userId);
      break;
    }

    // ── Payment succeeded ─────────────────────────────────────────────────────
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object;
      if (invoice.subscription) {
        const sub = await stripe.subscriptions.retrieve(invoice.subscription);
        const userId = sub.metadata.ccc_user_id;
        if (userId) {
          db.prepare(`UPDATE subscriptions SET status = 'active', updated_at = datetime('now') WHERE user_id = ?`).run(userId);
          // Log payment
          const { v4: uuidv4 } = require('uuid');
          db.prepare(`
            INSERT INTO payment_history (id, user_id, provider, amount, currency, status, provider_invoice_id, description)
            VALUES (?, ?, 'stripe', ?, ?, 'succeeded', ?, ?)
          `).run(uuidv4(), userId, invoice.amount_paid / 100, invoice.currency.toUpperCase(),
            invoice.id, invoice.description || 'Subscription payment');
        }
      }
      break;
    }

    // ── Payment failed ────────────────────────────────────────────────────────
    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      if (invoice.subscription) {
        const sub = await stripe.subscriptions.retrieve(invoice.subscription);
        const userId = sub.metadata.ccc_user_id;
        if (userId) {
          db.prepare(`UPDATE subscriptions SET status = 'past_due', updated_at = datetime('now') WHERE user_id = ?`).run(userId);
        }
      }
      break;
    }

    default:
      console.log(`Unhandled Stripe event: ${event.type}`);
  }

  return { received: true };
};

// ─── GET SUBSCRIPTION STATUS ──────────────────────────────────────────────────
const getSubscription = (userId) => {
  const db = getDB();
  return db.prepare('SELECT * FROM subscriptions WHERE user_id = ?').get(userId);
};

// ─── CANCEL SUBSCRIPTION ──────────────────────────────────────────────────────
const cancelSubscription = async (userId) => {
  const sub = getSubscription(userId);
  if (!sub?.stripe_subscription_id) throw new Error('No active Stripe subscription found');
  // Cancel at period end — customer keeps access until billing cycle ends
  await stripe.subscriptions.update(sub.stripe_subscription_id, {
    cancel_at_period_end: true,
  });
  const db = getDB();
  db.prepare(`UPDATE subscriptions SET cancel_at_period_end = 1, updated_at = datetime('now') WHERE user_id = ?`).run(userId);
  return { success: true, message: 'Subscription will cancel at end of billing period' };
};

module.exports = {
  createCheckoutSession,
  createPortalSession,
  handleStripeWebhook,
  getSubscription,
  cancelSubscription,
  getOrCreateStripeCustomer,
};
