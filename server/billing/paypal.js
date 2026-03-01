// server/billing/paypal.js
// PayPal Subscriptions integration

const { getDB } = require('../db');
const { TIERS } = require('./config');

const PAYPAL_BASE = process.env.PAYPAL_ENV === 'production'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

// ─── GET ACCESS TOKEN ─────────────────────────────────────────────────────────
const getPayPalToken = async () => {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !secret) {
    throw new Error('PayPal credentials not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in your .env file.');
  }

  const credentials = Buffer.from(`${clientId}:${secret}`).toString('base64');

  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`PayPal auth failed: ${err.error_description || 'Unknown error'}`);
  }

  const data = await res.json();
  return data.access_token;
};

// ─── PAYPAL API HELPER ────────────────────────────────────────────────────────
const paypalRequest = async (method, path, body = null) => {
  const token = await getPayPalToken();
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': `ccc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    },
  };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${PAYPAL_BASE}${path}`, options);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(`PayPal API error: ${data.message || JSON.stringify(data)}`);
  }
  return data;
};

// ─── CREATE SUBSCRIPTION ──────────────────────────────────────────────────────
// Returns a PayPal approval URL — customer is redirected here to approve
const createPayPalSubscription = async ({ userId, tier, interval, successUrl, cancelUrl }) => {
  const tierConfig = TIERS[tier];
  if (!tierConfig) throw new Error(`Invalid tier: ${tier}`);

  const planId = interval === 'annual'
    ? tierConfig.annual.paypalPlanId
    : tierConfig.monthly.paypalPlanId;

  if (!planId) {
    throw new Error(`PayPal plan ID not configured for ${tier} ${interval}. Set it in your .env file.`);
  }

  const subscription = await paypalRequest('POST', '/v1/billing/subscriptions', {
    plan_id: planId,
    custom_id: JSON.stringify({ userId, tier, interval }),
    application_context: {
      brand_name: 'Content Command Center OS',
      locale: 'en-US',
      shipping_preference: 'NO_SHIPPING',
      user_action: 'SUBSCRIBE_NOW',
      payment_method: {
        payer_selected: 'PAYPAL',
        payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED',
      },
      return_url: `${successUrl}&subscription_id={subscription.id}`,
      cancel_url: cancelUrl,
    },
  });

  // Find the approval URL
  const approvalUrl = subscription.links?.find(l => l.rel === 'approve')?.href;
  if (!approvalUrl) throw new Error('No PayPal approval URL returned');

  return { subscriptionId: subscription.id, approvalUrl };
};

// ─── CAPTURE / ACTIVATE SUBSCRIPTION ─────────────────────────────────────────
// Called after customer approves — activates the subscription in your DB
const activatePayPalSubscription = async (paypalSubscriptionId, userId) => {
  const subscription = await paypalRequest('GET', `/v1/billing/subscriptions/${paypalSubscriptionId}`);

  let customData = {};
  try { customData = JSON.parse(subscription.custom_id || '{}'); } catch {}

  const tier = customData.tier || 'starter';
  const interval = customData.interval || 'monthly';
  const status = subscription.status === 'ACTIVE' ? 'active' : 'inactive';

  const db = getDB();
  const { v4: uuidv4 } = require('uuid');

  const existing = db.prepare('SELECT * FROM subscriptions WHERE user_id = ?').get(userId);

  const periodStart = subscription.billing_info?.last_payment?.time
    ? new Date(subscription.billing_info.last_payment.time).toISOString()
    : new Date().toISOString();

  const periodEnd = subscription.billing_info?.next_billing_time
    ? new Date(subscription.billing_info.next_billing_time).toISOString()
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  if (existing) {
    db.prepare(`
      UPDATE subscriptions SET
        tier = ?, interval = ?, status = ?,
        paypal_subscription_id = ?,
        current_period_start = ?, current_period_end = ?,
        updated_at = datetime('now')
      WHERE user_id = ?
    `).run(tier, interval, status, paypalSubscriptionId, periodStart, periodEnd, userId);
  } else {
    db.prepare(`
      INSERT INTO subscriptions (id, user_id, tier, interval, status, paypal_subscription_id, current_period_start, current_period_end)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), userId, tier, interval, status, paypalSubscriptionId, periodStart, periodEnd);
  }

  // Update user tier
  db.prepare('UPDATE users SET tier = ?, updated_at = datetime(\'now\') WHERE id = ?').run(tier, userId);

  return { success: true, tier, status };
};

// ─── CANCEL PAYPAL SUBSCRIPTION ───────────────────────────────────────────────
const cancelPayPalSubscription = async (userId) => {
  const db = getDB();
  const sub = db.prepare('SELECT * FROM subscriptions WHERE user_id = ?').get(userId);
  if (!sub?.paypal_subscription_id) throw new Error('No PayPal subscription found');

  await paypalRequest('POST', `/v1/billing/subscriptions/${sub.paypal_subscription_id}/cancel`, {
    reason: 'Customer requested cancellation',
  });

  db.prepare(`UPDATE subscriptions SET status = 'canceled', cancel_at_period_end = 1, updated_at = datetime('now') WHERE user_id = ?`).run(userId);
  return { success: true };
};

// ─── HANDLE PAYPAL WEBHOOKS ───────────────────────────────────────────────────
const handlePayPalWebhook = async (event, headers) => {
  // Verify webhook (basic check — enhance with PayPal's verify-webhook-signature in production)
  const eventType = event.event_type;
  const db = getDB();

  console.log(`PayPal webhook received: ${eventType}`);

  switch (eventType) {

    case 'BILLING.SUBSCRIPTION.ACTIVATED':
    case 'BILLING.SUBSCRIPTION.UPDATED': {
      const sub = event.resource;
      let customData = {};
      try { customData = JSON.parse(sub.custom_id || '{}'); } catch {}
      const userId = customData.userId;
      if (!userId) break;

      const tier = customData.tier || 'starter';
      const interval = customData.interval || 'monthly';

      db.prepare(`
        UPDATE subscriptions SET status = 'active', tier = ?, interval = ?, updated_at = datetime('now')
        WHERE paypal_subscription_id = ?
      `).run(tier, interval, sub.id);
      db.prepare('UPDATE users SET tier = ? WHERE id = ?').run(tier, userId);
      break;
    }

    case 'BILLING.SUBSCRIPTION.CANCELLED':
    case 'BILLING.SUBSCRIPTION.EXPIRED': {
      const sub = event.resource;
      db.prepare(`UPDATE subscriptions SET status = 'canceled', updated_at = datetime('now') WHERE paypal_subscription_id = ?`).run(sub.id);
      // Find user and downgrade
      const subscription = db.prepare('SELECT user_id FROM subscriptions WHERE paypal_subscription_id = ?').get(sub.id);
      if (subscription) {
        db.prepare('UPDATE users SET tier = \'free\' WHERE id = ?').run(subscription.user_id);
      }
      break;
    }

    case 'PAYMENT.SALE.COMPLETED': {
      const payment = event.resource;
      const { v4: uuidv4 } = require('uuid');
      // Log payment - find user from subscription
      if (payment.billing_agreement_id) {
        const sub = db.prepare('SELECT user_id FROM subscriptions WHERE paypal_subscription_id = ?').get(payment.billing_agreement_id);
        if (sub) {
          db.prepare(`
            INSERT OR IGNORE INTO payment_history (id, user_id, provider, amount, currency, status, provider_invoice_id, description)
            VALUES (?, ?, 'paypal', ?, ?, 'succeeded', ?, 'PayPal subscription payment')
          `).run(uuidv4(), sub.user_id, parseFloat(payment.amount?.total || 0),
            payment.amount?.currency || 'USD', payment.id);

          // Reset monthly usage on successful payment
          db.prepare('UPDATE users SET ai_usage_this_month = 0 WHERE id = ?').run(sub.user_id);
        }
      }
      break;
    }

    default:
      console.log(`Unhandled PayPal event: ${eventType}`);
  }

  return { received: true };
};

module.exports = {
  createPayPalSubscription,
  activatePayPalSubscription,
  cancelPayPalSubscription,
  handlePayPalWebhook,
};
