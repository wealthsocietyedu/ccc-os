// server/scripts/setup-stripe.js
// Run this ONCE to create all Stripe products and prices automatically
// Usage: node server/scripts/setup-stripe.js
//
// After running, copy the output into your server/.env file

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'sk_test_...') {
  console.error('\n❌  No Stripe key found.\n');
  console.error('   1. Go to https://dashboard.stripe.com/apikeys');
  console.error('   2. Copy your Secret key (starts with sk_test_ or sk_live_)');
  console.error('   3. Add it to server/.env as STRIPE_SECRET_KEY=sk_...\n');
  process.exit(1);
}

const PLANS = [
  {
    id: 'starter',
    name: 'CCC OS — Starter',
    description: 'For creators building a single personal brand. 1 brand, 50 AI generations/month.',
    monthly: { price: 7900, envKey: 'STRIPE_STARTER_MONTHLY_PRICE_ID' },
    annual:  { price: 79000, envKey: 'STRIPE_STARTER_ANNUAL_PRICE_ID' },
  },
  {
    id: 'pro',
    name: 'CCC OS — Pro',
    description: 'For operators running multiple brands. 5 brands, 300 AI generations/month, video & voice.',
    monthly: { price: 24900, envKey: 'STRIPE_PRO_MONTHLY_PRICE_ID' },
    annual:  { price: 249000, envKey: 'STRIPE_PRO_ANNUAL_PRICE_ID' },
  },
  {
    id: 'operator',
    name: 'CCC OS — Operator',
    description: 'For agencies at scale. Unlimited brands, unlimited AI generations, full operator toolkit.',
    monthly: { price: 79900, envKey: 'STRIPE_OPERATOR_MONTHLY_PRICE_ID' },
    annual:  { price: 799000, envKey: 'STRIPE_OPERATOR_ANNUAL_PRICE_ID' },
  },
];

async function setupStripe() {
  console.log('\n🚀  Setting up Stripe products and prices for Content Command Center OS...\n');

  const isLive = process.env.STRIPE_SECRET_KEY.startsWith('sk_live_');
  console.log(`   Mode: ${isLive ? '🔴 LIVE' : '🟡 TEST (sandbox)'}\n`);

  const results = {};
  const envLines = [];

  for (const plan of PLANS) {
    console.log(`   Creating product: ${plan.name}`);

    // Check if product already exists
    const existing = await stripe.products.search({
      query: `name:'${plan.name}' AND active:'true'`,
      limit: 1,
    }).catch(() => ({ data: [] }));

    let product;
    if (existing.data.length > 0) {
      product = existing.data[0];
      console.log(`   ✓ Product already exists: ${product.id}`);
    } else {
      product = await stripe.products.create({
        name: plan.name,
        description: plan.description,
        metadata: { ccc_tier: plan.id },
      });
      console.log(`   ✓ Product created: ${product.id}`);
    }

    results[plan.id] = { productId: product.id };

    // Create monthly price
    const existingMonthly = await stripe.prices.list({
      product: product.id,
      active: true,
      recurring: { interval: 'month' },
      limit: 1,
    }).then(r => r.data[0]).catch(() => null);

    let monthlyPrice;
    if (existingMonthly) {
      monthlyPrice = existingMonthly;
      console.log(`   ✓ Monthly price already exists: ${monthlyPrice.id} ($${plan.monthly.price / 100}/mo)`);
    } else {
      monthlyPrice = await stripe.prices.create({
        product: product.id,
        currency: 'usd',
        unit_amount: plan.monthly.price,
        recurring: { interval: 'month' },
        nickname: `${plan.name} — Monthly`,
        metadata: { ccc_tier: plan.id, interval: 'monthly' },
      });
      console.log(`   ✓ Monthly price created: ${monthlyPrice.id} ($${plan.monthly.price / 100}/mo)`);
    }

    results[plan.id].monthlyPriceId = monthlyPrice.id;
    envLines.push(`${plan.monthly.envKey}=${monthlyPrice.id}`);

    // Create annual price
    const existingAnnual = await stripe.prices.list({
      product: product.id,
      active: true,
      recurring: { interval: 'year' },
      limit: 1,
    }).then(r => r.data[0]).catch(() => null);

    let annualPrice;
    if (existingAnnual) {
      annualPrice = existingAnnual;
      console.log(`   ✓ Annual price already exists: ${annualPrice.id} ($${plan.annual.price / 100}/yr)`);
    } else {
      annualPrice = await stripe.prices.create({
        product: product.id,
        currency: 'usd',
        unit_amount: plan.annual.price,
        recurring: { interval: 'year' },
        nickname: `${plan.name} — Annual (2 months free)`,
        metadata: { ccc_tier: plan.id, interval: 'annual' },
      });
      console.log(`   ✓ Annual price created: ${annualPrice.id} ($${plan.annual.price / 100}/yr)`);
    }

    results[plan.id].annualPriceId = annualPrice.id;
    envLines.push(`${plan.annual.envKey}=${annualPrice.id}`);
    console.log('');
  }

  // Configure customer portal
  console.log('   Configuring Stripe Customer Portal...');
  try {
    await stripe.billingPortal.configurations.create({
      business_profile: {
        headline: 'Content Command Center OS — Manage your subscription',
      },
      features: {
        subscription_cancel: {
          enabled: true,
          mode: 'at_period_end',
          proration_behavior: 'none',
        },
        subscription_update: {
          enabled: true,
          default_allowed_updates: ['price'],
          proration_behavior: 'always_invoice',
          products: PLANS.map(p => ({
            product: results[p.id].productId,
            prices: [results[p.id].monthlyPriceId, results[p.id].annualPriceId],
          })),
        },
        invoice_history: { enabled: true },
        payment_method_update: { enabled: true },
      },
    });
    console.log('   ✓ Customer portal configured\n');
  } catch (err) {
    console.log(`   ⚠  Portal config: ${err.message} (may already be configured)\n`);
  }

  // Print results
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('✅  ALL DONE — Copy these lines into your server/.env file:\n');
  envLines.forEach(line => console.log('   ' + line));
  console.log('\n   Then set up your webhook:');
  console.log('   1. Go to https://dashboard.stripe.com/webhooks');
  console.log('   2. Click "Add endpoint"');
  console.log(`   3. URL: https://YOUR-DOMAIN.com/api/billing/webhooks/stripe`);
  console.log('   4. Select these events:');
  console.log('      • customer.subscription.created');
  console.log('      • customer.subscription.updated');
  console.log('      • customer.subscription.deleted');
  console.log('      • invoice.payment_succeeded');
  console.log('      • invoice.payment_failed');
  console.log('   5. Copy the Signing Secret → add as STRIPE_WEBHOOK_SECRET=whsec_...');
  console.log('\n   For local testing, install Stripe CLI and run:');
  console.log('   stripe listen --forward-to localhost:3001/api/billing/webhooks/stripe');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

setupStripe().catch(err => {
  console.error('\n❌  Setup failed:', err.message);
  if (err.type === 'StripeAuthenticationError') {
    console.error('   Your Stripe key is invalid. Check STRIPE_SECRET_KEY in server/.env');
  }
  process.exit(1);
});
