// server/scripts/verify-billing.js
// Run this to verify all billing config is correct before going live
// Usage: node server/scripts/verify-billing.js

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const REQUIRED_ENV = [
  // Stripe
  'STRIPE_SECRET_KEY',
  'STRIPE_PUBLISHABLE_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_STARTER_MONTHLY_PRICE_ID',
  'STRIPE_STARTER_ANNUAL_PRICE_ID',
  'STRIPE_PRO_MONTHLY_PRICE_ID',
  'STRIPE_PRO_ANNUAL_PRICE_ID',
  'STRIPE_OPERATOR_MONTHLY_PRICE_ID',
  'STRIPE_OPERATOR_ANNUAL_PRICE_ID',
  // PayPal
  'PAYPAL_CLIENT_ID',
  'PAYPAL_CLIENT_SECRET',
  'PAYPAL_STARTER_MONTHLY_PLAN_ID',
  'PAYPAL_STARTER_ANNUAL_PLAN_ID',
  'PAYPAL_PRO_MONTHLY_PLAN_ID',
  'PAYPAL_PRO_ANNUAL_PLAN_ID',
  'PAYPAL_OPERATOR_MONTHLY_PLAN_ID',
  'PAYPAL_OPERATOR_ANNUAL_PLAN_ID',
];

const PLACEHOLDERS = ['sk_test_...', 'pk_test_...', 'whsec_...', 'price_...', 'P-...', '...'];

async function verify() {
  console.log('\n🔍  Verifying Content Command Center OS billing config...\n');

  let allGood = true;
  const missing = [];
  const placeholder = [];

  for (const key of REQUIRED_ENV) {
    const val = process.env[key];
    if (!val) {
      missing.push(key);
      allGood = false;
    } else if (PLACEHOLDERS.some(p => val === p || val.endsWith('...'))) {
      placeholder.push(key);
      allGood = false;
    }
  }

  if (missing.length > 0) {
    console.log('❌  Missing environment variables:');
    missing.forEach(k => console.log(`   - ${k}`));
    console.log('');
  }

  if (placeholder.length > 0) {
    console.log('⚠️   Still using placeholder values (not configured yet):');
    placeholder.forEach(k => console.log(`   - ${k}`));
    console.log('');
  }

  // Verify Stripe prices exist
  if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.endsWith('...')) {
    console.log('   Verifying Stripe prices...');
    const priceKeys = [
      'STRIPE_STARTER_MONTHLY_PRICE_ID', 'STRIPE_STARTER_ANNUAL_PRICE_ID',
      'STRIPE_PRO_MONTHLY_PRICE_ID', 'STRIPE_PRO_ANNUAL_PRICE_ID',
      'STRIPE_OPERATOR_MONTHLY_PRICE_ID', 'STRIPE_OPERATOR_ANNUAL_PRICE_ID',
    ];

    for (const key of priceKeys) {
      const priceId = process.env[key];
      if (!priceId || priceId.endsWith('...')) continue;
      try {
        const price = await stripe.prices.retrieve(priceId);
        const amount = (price.unit_amount / 100).toFixed(2);
        const interval = price.recurring?.interval;
        console.log(`   ✓ ${key}: $${amount}/${interval} (${price.active ? 'active' : '⚠️ INACTIVE'})`);
        if (!price.active) allGood = false;
      } catch (err) {
        console.log(`   ❌ ${key}: ${err.message}`);
        allGood = false;
      }
    }
    console.log('');
  }

  // Summary
  if (allGood) {
    console.log('✅  All billing config verified. Ready to accept payments!\n');
    console.log('   Quick test checklist:');
    console.log('   □ Test Stripe checkout with card 4242 4242 4242 4242');
    console.log('   □ Test annual checkout with card 4242 4242 4242 4242');
    console.log('   □ Test PayPal checkout with your sandbox buyer account');
    console.log('   □ Confirm tier updates in DB after payment');
    console.log('   □ Test upgrade prompt appears when limit is hit');
    console.log('   □ Test cancel subscription → access retained until period end\n');
  } else {
    console.log('─────────────────────────────────────────────────────────────');
    console.log('⏳  Setup incomplete. Run these scripts first:\n');
    if (missing.some(k => k.includes('STRIPE')) || placeholder.some(k => k.includes('STRIPE'))) {
      console.log('   node server/scripts/setup-stripe.js');
    }
    if (missing.some(k => k.includes('PAYPAL')) || placeholder.some(k => k.includes('PAYPAL'))) {
      console.log('   node server/scripts/setup-paypal.js');
    }
    console.log('');
  }
}

verify().catch(err => {
  console.error('❌  Verification failed:', err.message);
  process.exit(1);
});
