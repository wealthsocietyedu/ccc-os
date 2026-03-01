// server/scripts/setup-paypal.js
// Run this ONCE to create all PayPal subscription plans automatically
// Usage: node server/scripts/setup-paypal.js
//
// After running, copy the output into your server/.env file

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const PAYPAL_BASE = process.env.PAYPAL_ENV === 'production'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

const PLANS = [
  {
    id: 'starter',
    name: 'CCC OS — Starter',
    description: 'For creators building a single personal brand. 1 brand, 50 AI generations/month.',
    monthly: {
      price: '79.00',
      envKey: 'PAYPAL_STARTER_MONTHLY_PLAN_ID',
      setupFee: null,
    },
    annual: {
      price: '790.00',
      envKey: 'PAYPAL_STARTER_ANNUAL_PLAN_ID',
      setupFee: null,
    },
  },
  {
    id: 'pro',
    name: 'CCC OS — Pro',
    description: 'For operators running multiple brands. 5 brands, 300 AI generations/month, video & voice.',
    monthly: {
      price: '249.00',
      envKey: 'PAYPAL_PRO_MONTHLY_PLAN_ID',
      setupFee: null,
    },
    annual: {
      price: '2490.00',
      envKey: 'PAYPAL_PRO_ANNUAL_PLAN_ID',
      setupFee: null,
    },
  },
  {
    id: 'operator',
    name: 'CCC OS — Operator',
    description: 'For agencies at scale. Unlimited brands, unlimited AI generations, full operator toolkit.',
    monthly: {
      price: '799.00',
      envKey: 'PAYPAL_OPERATOR_MONTHLY_PLAN_ID',
      setupFee: null,
    },
    annual: {
      price: '7990.00',
      envKey: 'PAYPAL_OPERATOR_ANNUAL_PLAN_ID',
      setupFee: null,
    },
  },
];

async function getToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || clientId === '...' || !secret || secret === '...') {
    console.error('\n❌  PayPal credentials not found.\n');
    console.error('   1. Go to https://developer.paypal.com/dashboard/applications');
    console.error('   2. Create a new app (or use an existing one)');
    console.error('   3. Copy Client ID → add as PAYPAL_CLIENT_ID=... in server/.env');
    console.error('   4. Copy Client Secret → add as PAYPAL_CLIENT_SECRET=... in server/.env');
    console.error('   5. Set PAYPAL_ENV=sandbox for testing, production for live\n');
    process.exit(1);
  }

  const credentials = Buffer.from(`${clientId}:${secret}`).toString('base64');
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: { 'Authorization': `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`PayPal auth failed: ${err.error_description || JSON.stringify(err)}`);
  }

  return (await res.json()).access_token;
}

async function paypalRequest(method, path, body, token) {
  const res = await fetch(`${PAYPAL_BASE}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': `ccc-setup-${Date.now()}-${Math.random().toString(36).substr(2,6)}`,
      'Prefer': 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`PayPal API error: ${data.message || JSON.stringify(data)}`);
  return data;
}

async function createProduct(token, plan) {
  // Check if product exists
  try {
    const list = await paypalRequest('GET', `/v1/catalogs/products?page_size=20`, null, token);
    const existing = list.products?.find(p => p.name === plan.name);
    if (existing) {
      console.log(`   ✓ Product already exists: ${existing.id}`);
      return existing.id;
    }
  } catch (e) { /* continue to create */ }

  const product = await paypalRequest('POST', '/v1/catalogs/products', {
    name: plan.name,
    description: plan.description,
    type: 'SERVICE',
    category: 'SOFTWARE',
  }, token);

  console.log(`   ✓ Product created: ${product.id}`);
  return product.id;
}

async function createPlan(token, productId, planName, interval, price, description) {
  const intervalUnit = interval === 'monthly' ? 'MONTH' : 'YEAR';
  const intervalCount = 1;

  const plan = await paypalRequest('POST', '/v1/billing/plans', {
    product_id: productId,
    name: `${planName} — ${interval === 'monthly' ? 'Monthly' : 'Annual (2 months free)'}`,
    description,
    status: 'ACTIVE',
    billing_cycles: [
      {
        frequency: { interval_unit: intervalUnit, interval_count: intervalCount },
        tenure_type: 'REGULAR',
        sequence: 1,
        total_cycles: 0, // 0 = infinite
        pricing_scheme: {
          fixed_price: { value: price, currency_code: 'USD' },
        },
      },
    ],
    payment_preferences: {
      auto_bill_outstanding: true,
      setup_fee: { value: '0', currency_code: 'USD' },
      setup_fee_failure_action: 'CONTINUE',
      payment_failure_threshold: 3,
    },
  }, token);

  return plan.id;
}

async function setupPayPal() {
  console.log('\n🚀  Setting up PayPal subscription plans for Content Command Center OS...\n');

  const isLive = process.env.PAYPAL_ENV === 'production';
  console.log(`   Mode: ${isLive ? '🔴 LIVE' : '🟡 SANDBOX (testing)'}\n`);

  const token = await getToken();
  const envLines = [];

  for (const plan of PLANS) {
    console.log(`   Setting up: ${plan.name}`);

    const productId = await createProduct(token, plan);

    // Monthly plan
    console.log(`   Creating monthly plan ($${plan.monthly.price}/mo)...`);
    const monthlyPlanId = await createPlan(token, productId, plan.name, 'monthly', plan.monthly.price, plan.description);
    console.log(`   ✓ Monthly plan created: ${monthlyPlanId}`);
    envLines.push(`${plan.monthly.envKey}=${monthlyPlanId}`);

    // Annual plan
    console.log(`   Creating annual plan ($${plan.annual.price}/yr)...`);
    const annualPlanId = await createPlan(token, productId, plan.name, 'annual', plan.annual.price, plan.description);
    console.log(`   ✓ Annual plan created: ${annualPlanId}`);
    envLines.push(`${plan.annual.envKey}=${annualPlanId}`);
    console.log('');
  }

  // Print results
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('✅  ALL DONE — Copy these lines into your server/.env file:\n');
  envLines.forEach(line => console.log('   ' + line));
  console.log('\n   Then set up your PayPal webhook:');
  console.log('   1. Go to https://developer.paypal.com/dashboard/applications');
  console.log('   2. Select your app → Webhooks → Add Webhook');
  console.log(`   3. URL: https://YOUR-DOMAIN.com/api/billing/webhooks/paypal`);
  console.log('   4. Select these events:');
  console.log('      • BILLING.SUBSCRIPTION.ACTIVATED');
  console.log('      • BILLING.SUBSCRIPTION.CANCELLED');
  console.log('      • BILLING.SUBSCRIPTION.EXPIRED');
  console.log('      • BILLING.SUBSCRIPTION.UPDATED');
  console.log('      • PAYMENT.SALE.COMPLETED');
  console.log('\n   For sandbox testing:');
  console.log('   Use buyer account from https://developer.paypal.com/dashboard/accounts');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

setupPayPal().catch(err => {
  console.error('\n❌  Setup failed:', err.message);
  process.exit(1);
});
