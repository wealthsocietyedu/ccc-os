// server/billing/config.js
// Single source of truth for all pricing, tiers, and limits
// Change prices here — nowhere else

const TIERS = {
  starter: {
    name: 'Starter',
    description: 'For creators building a single personal brand',
    monthly: {
      price: 49,
      priceId: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID,
      paypalPlanId: process.env.PAYPAL_STARTER_MONTHLY_PLAN_ID,
    },
    annual: {
      price: 470,           // $39.17/mo — save $118/yr (2 months free)
      monthlyEquivalent: 39,
      priceId: process.env.STRIPE_STARTER_ANNUAL_PRICE_ID,
      paypalPlanId: process.env.PAYPAL_STARTER_ANNUAL_PLAN_ID,
    },
    limits: {
      brands: 1,
      videos_per_month: 10,
      team_members: 1,
      hooks_library: true,
      weekly_review: true,
      advanced_analytics: false,
      funnel_module: false,
      campaign_planner: false,
      multi_brand: false,
      client_cloning: false,
      sop_library: false,
    },
    color: '#6C47FF',
    badge: null,
  },

  pro: {
    name: 'Pro',
    description: 'For operators running multiple brands',
    monthly: {
      price: 99,
      priceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
      paypalPlanId: process.env.PAYPAL_PRO_MONTHLY_PLAN_ID,
    },
    annual: {
      price: 950,           // $79.17/mo — save $238/yr
      monthlyEquivalent: 79,
      priceId: process.env.STRIPE_PRO_ANNUAL_PRICE_ID,
      paypalPlanId: process.env.PAYPAL_PRO_ANNUAL_PLAN_ID,
    },
    limits: {
      brands: 5,
      videos_per_month: 25,
      team_members: 3,
      hooks_library: true,
      weekly_review: true,
      advanced_analytics: true,
      funnel_module: true,
      campaign_planner: true,
      multi_brand: true,
      client_cloning: false,
      sop_library: false,
    },
    color: '#FF6B35',
    badge: 'Most Popular',
  },

  operator: {
    name: 'Operator',
    description: 'For agencies managing multiple clients at scale',
    monthly: {
      price: 249,
      priceId: process.env.STRIPE_OPERATOR_MONTHLY_PRICE_ID,
      paypalPlanId: process.env.PAYPAL_OPERATOR_MONTHLY_PLAN_ID,
    },
    annual: {
      price: 2390,          // $199.17/mo — save $598/yr
      monthlyEquivalent: 199,
      priceId: process.env.STRIPE_OPERATOR_ANNUAL_PRICE_ID,
      paypalPlanId: process.env.PAYPAL_OPERATOR_ANNUAL_PLAN_ID,
    },
    limits: {
      brands: -1,           // -1 = unlimited
      videos_per_month: 100,
      team_members: -1,
      hooks_library: true,
      weekly_review: true,
      advanced_analytics: true,
      funnel_module: true,
      campaign_planner: true,
      multi_brand: true,
      client_cloning: true,
      sop_library: true,
    },
    color: '#22c55e',
    badge: 'Best Value',
  },
};

const getTier = (tierName) => TIERS[tierName] || TIERS.starter;

const getTierLimits = (tierName) => getTier(tierName).limits;

const canAccessFeature = (tierName, feature) => {
  const limits = getTierLimits(tierName);
  const val = limits[feature];
  return val === true || val === -1 || (typeof val === 'number' && val > 0);
};

const isUnlimited = (tierName, limitKey) => {
  return getTierLimits(tierName)[limitKey] === -1;
};

module.exports = { TIERS, getTier, getTierLimits, canAccessFeature, isUnlimited };
