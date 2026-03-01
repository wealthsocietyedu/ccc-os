// client/src/pages/Billing.jsx
// Pricing page, checkout flow, billing management, upgrade prompts

import { useState, useEffect } from 'react';

const BILLING_STYLES = `
  .pricing-page { max-width: 1000px; margin: 0 auto; padding: 40px 28px; }
  .pricing-hero { text-align: center; margin-bottom: 48px; }
  .pricing-hero-title { font-family: var(--font-d); font-size: 36px; font-weight: 800; color: var(--text); margin-bottom: 10px; line-height: 1.15; }
  .pricing-hero-title span { color: var(--accent2); }
  .pricing-hero-sub { font-size: 15px; color: var(--text3); max-width: 480px; margin: 0 auto; }

  .billing-toggle { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 40px; }
  .billing-toggle-label { font-size: 13px; font-weight: 600; color: var(--text2); }
  .billing-toggle-label.active { color: var(--text); }
  .toggle-switch { width: 44px; height: 24px; background: var(--accent); border-radius: 12px; cursor: pointer; position: relative; transition: background .15s; }
  .toggle-switch::after { content: ''; position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; background: white; border-radius: 50%; transition: transform .15s; }
  .toggle-switch.annual::after { transform: translateX(20px); }
  .toggle-switch.monthly { background: var(--surface2); }
  .annual-badge { background: var(--green-d); color: var(--green); font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 20px; border: 1px solid rgba(34,197,94,.25); }

  .pricing-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 40px; }
  .pricing-card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 28px; position: relative; transition: border-color .15s, transform .15s; }
  .pricing-card:hover { border-color: var(--border2); transform: translateY(-2px); }
  .pricing-card.popular { border-color: var(--accent); }
  .pricing-card.popular::before { content: attr(data-badge); position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: var(--accent); color: white; font-size: 11px; font-weight: 700; padding: 3px 12px; border-radius: 20px; white-space: nowrap; }
  .pricing-card-name { font-family: var(--font-d); font-size: 18px; font-weight: 800; color: var(--text); margin-bottom: 4px; }
  .pricing-card-desc { font-size: 12.5px; color: var(--text3); margin-bottom: 20px; line-height: 1.4; }
  .pricing-price { margin-bottom: 6px; }
  .pricing-price-amount { font-family: var(--font-d); font-size: 40px; font-weight: 800; color: var(--text); line-height: 1; }
  .pricing-price-period { font-size: 13px; color: var(--text3); margin-left: 4px; }
  .pricing-annual-note { font-size: 11.5px; color: var(--green); margin-bottom: 20px; min-height: 18px; }
  .pricing-divider { height: 1px; background: var(--border); margin: 18px 0; }
  .pricing-features { list-style: none; margin-bottom: 24px; }
  .pricing-feature { display: flex; align-items: flex-start; gap: 9px; padding: 5px 0; font-size: 12.5px; color: var(--text2); }
  .pricing-feature-icon { flex-shrink: 0; margin-top: 1px; }
  .pricing-feature.locked { color: var(--text3); }
  .pricing-cta { width: 100%; padding: 11px; border-radius: var(--r-sm); font-family: var(--font-b); font-size: 13.5px; font-weight: 700; cursor: pointer; border: none; transition: all .13s; text-align: center; }
  .pricing-cta.primary { background: var(--accent); color: white; }
  .pricing-cta.primary:hover { background: var(--accent2); }
  .pricing-cta.outline { background: none; border: 1px solid var(--border2); color: var(--text2); }
  .pricing-cta.outline:hover { border-color: var(--accent); color: var(--text); }
  .pricing-cta:disabled { opacity: .5; cursor: not-allowed; }

  .payment-method-select { display: flex; gap: 10px; margin-bottom: 18px; }
  .payment-method-btn { flex: 1; padding: 12px; background: var(--surface); border: 2px solid var(--border); border-radius: var(--r-sm); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; font-family: var(--font-b); font-size: 13px; font-weight: 600; color: var(--text2); transition: all .13s; }
  .payment-method-btn:hover { border-color: var(--border2); }
  .payment-method-btn.selected { border-color: var(--accent); color: var(--text); background: var(--accent3); }
  .payment-method-icon { font-size: 20px; }

  .billing-panel { max-width: 680px; }
  .billing-section { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); padding: 22px; margin-bottom: 18px; }
  .billing-section-title { font-family: var(--font-d); font-size: 14px; font-weight: 700; color: var(--text); margin-bottom: 16px; }
  .current-plan-badge { display: inline-flex; align-items: center; gap: 8px; background: var(--accent3); border: 1px solid rgba(108,71,255,.3); border-radius: var(--r-sm); padding: 8px 14px; margin-bottom: 14px; }
  .current-plan-name { font-family: var(--font-d); font-size: 16px; font-weight: 800; color: var(--accent2); }
  .usage-bar-wrap { margin: 14px 0; }
  .usage-bar-labels { display: flex; justify-content: space-between; font-size: 11.5px; color: var(--text3); margin-bottom: 6px; }
  .usage-bar { height: 8px; background: var(--surface2); border-radius: 4px; overflow: hidden; }
  .usage-bar-fill { height: 100%; border-radius: 4px; transition: width .6s ease; }

  .upgrade-prompt-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.8); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 20px; }
  .upgrade-prompt { background: var(--bg2); border: 1px solid var(--border2); border-radius: 18px; padding: 32px; width: 100%; max-width: 480px; text-align: center; animation: fadeUp .18s ease; }
  .upgrade-prompt-icon { font-size: 48px; margin-bottom: 12px; }
  .upgrade-prompt-title { font-family: var(--font-d); font-size: 22px; font-weight: 800; color: var(--text); margin-bottom: 8px; }
  .upgrade-prompt-sub { font-size: 13.5px; color: var(--text3); line-height: 1.5; margin-bottom: 24px; }
  .upgrade-prompt-features { background: var(--surface); border-radius: var(--r-sm); padding: 14px 18px; margin-bottom: 22px; text-align: left; }
  .upgrade-feature { display: flex; align-items: center; gap: 9px; padding: 5px 0; font-size: 13px; color: var(--text2); }
  .upgrade-feature-check { color: var(--green); }

  .success-screen { min-height: 100vh; display: flex; align-items: center; justify-content: center; text-align: center; padding: 20px; }
  .success-card { background: var(--bg2); border: 1px solid var(--border2); border-radius: 18px; padding: 48px 40px; max-width: 440px; }
  .success-icon { font-size: 56px; margin-bottom: 16px; }
  .success-title { font-family: var(--font-d); font-size: 26px; font-weight: 800; color: var(--text); margin-bottom: 8px; }
  .success-sub { font-size: 14px; color: var(--text3); line-height: 1.5; margin-bottom: 28px; }
`;

// ─── PRICING FEATURES CONFIG ──────────────────────────────────────────────────
const PLAN_FEATURES = {
  starter: [
    { text: '1 brand', available: true },
    { text: '50 AI generations/month', available: true },
    { text: 'Text & image generation', available: true },
    { text: 'Hook library + Idea vault', available: true },
    { text: 'Production pipeline', available: true },
    { text: 'Weekly review system', available: true },
    { text: 'Video & voice generation', available: false },
    { text: 'Multi-brand dashboard', available: false },
    { text: 'Advanced analytics', available: false },
    { text: 'Funnel + Campaign planner', available: false },
  ],
  pro: [
    { text: '5 brands', available: true },
    { text: '300 AI generations/month', available: true },
    { text: 'All AI types: text, image, voice, video', available: true },
    { text: 'Multi-brand dashboard', available: true },
    { text: 'Advanced analytics + KPI tracking', available: true },
    { text: 'Funnel map + CTA routing', available: true },
    { text: 'Campaign planner', available: true },
    { text: 'Revenue calculator', available: true },
    { text: 'Unlimited team members', available: false },
    { text: 'Client cloning system', available: false },
  ],
  operator: [
    { text: 'Unlimited brands', available: true },
    { text: 'Unlimited AI generations', available: true },
    { text: 'All AI types + priority processing', available: true },
    { text: 'Everything in Pro', available: true },
    { text: 'Unlimited team members', available: true },
    { text: 'Client dashboard cloning', available: true },
    { text: 'SOP library', available: true },
    { text: 'Advanced reporting exports', available: true },
    { text: 'Quarterly planning system', available: true },
    { text: 'Agency onboarding tools', available: true },
  ],
};

// ─── CHECK ICON ───────────────────────────────────────────────────────────────
const CheckIcon = ({ available }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    style={{ color: available ? 'var(--green)' : 'var(--text3)', flexShrink: 0 }}>
    {available
      ? <polyline points="20 6 9 17 4 12" />
      : <line x1="18" y1="6" x2="6" y2="18" />}
  </svg>
);

// ─── PRICING PAGE ─────────────────────────────────────────────────────────────
export function PricingPage({ currentTier, onSubscribe, loading }) {
  const [interval, setInterval] = useState('monthly');
  const [selectedPayment, setSelectedPayment] = useState('stripe');
  const [checkoutLoading, setCheckoutLoading] = useState('');

  const plans = [
    {
      id: 'starter', name: 'Starter', color: '#6C47FF', badge: null,
      monthly: 49, annual: 470, annualMonthly: 39, savings: 118,
      features: [
        '1 brand',
        'Command Center Dashboard',
        'Strategy Room — Content Pillars',
        'Production Room — Idea Vault + Hook Library',
        'Content Studio — 10 videos/month',
        'Weekly Review System',
        'KPI Tracking',
      ],
      notIncluded: ['Multi-brand', 'Funnel + CTA routing', 'Campaign planner', 'Client cloning'],
    },
    {
      id: 'pro', name: 'Pro', color: '#FF6B35', badge: 'Most Popular',
      monthly: 99, annual: 950, annualMonthly: 79, savings: 238,
      features: [
        '5 brands',
        'Everything in Starter',
        'Distribution Room — Funnel + CTA Routing',
        'Data Room — Advanced Analytics',
        'Monetization Room — Revenue Calculator',
        'Content Studio — 25 videos/month',
        'Campaign Planner',
        'Multi-brand Dashboard',
      ],
      notIncluded: ['Client cloning system', 'SOP library', 'Automation playbooks'],
    },
    {
      id: 'operator', name: 'Operator', color: '#22c55e', badge: 'Best Value',
      monthly: 249, annual: 2390, annualMonthly: 199, savings: 598,
      features: [
        'Unlimited brands',
        'Everything in Pro',
        'Content Studio — 100 videos/month',
        'Client Dashboard Cloning',
        'SOP Library',
        'Automation Playbooks',
        'Quarterly Planning System',
        'Priority Support',
      ],
      notIncluded: [],
    },
  ];

  const handleSubscribe = async (tier) => {
    if (checkoutLoading) return;
    setCheckoutLoading(tier);
    try {
      await onSubscribe(tier, interval, selectedPayment);
    } finally {
      setCheckoutLoading('');
    }
  };

  const price = (plan) => interval === 'annual' ? plan.annualMonthly : plan.monthly;

  return (
    <>
      <style>{BILLING_STYLES}</style>
      <div className="pricing-page">
        <div className="pricing-hero">
          <div className="pricing-hero-title">
            The OS that turns content<br />into a <span>business.</span>
          </div>
          <div className="pricing-hero-sub">
            Pick your tier. Everything you need to create, distribute, and monetize content — all in one system.
          </div>
        </div>

        {/* Monthly / Annual Toggle */}
        <div className="billing-toggle">
          <span className={`billing-toggle-label ${interval === 'monthly' ? 'active' : ''}`}>Monthly</span>
          <div
            className={`toggle-switch ${interval === 'annual' ? 'annual' : 'monthly'}`}
            onClick={() => setInterval(i => i === 'monthly' ? 'annual' : 'monthly')}
          />
          <span className={`billing-toggle-label ${interval === 'annual' ? 'active' : ''}`}>Annual</span>
          {interval === 'annual' && <span className="annual-badge">Save 2 months free</span>}
        </div>

        {/* Payment Method */}
        <div style={{ maxWidth: 380, margin: '0 auto 32px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text3)', marginBottom: 8, textAlign: 'center' }}>Pay with</div>
          <div className="payment-method-select">
            <button className={`payment-method-btn ${selectedPayment === 'stripe' ? 'selected' : ''}`} onClick={() => setSelectedPayment('stripe')}>
              <span className="payment-method-icon">💳</span> Credit Card
            </button>
            <button className={`payment-method-btn ${selectedPayment === 'paypal' ? 'selected' : ''}`} onClick={() => setSelectedPayment('paypal')}>
              <span className="payment-method-icon">🅿️</span> PayPal
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="pricing-grid">
          {plans.map(plan => {
            const isCurrentPlan = currentTier === plan.id;
            const isPopular = plan.badge === 'Most Popular';

            return (
              <div
                key={plan.id}
                className={`pricing-card ${isPopular ? 'popular' : ''}`}
                data-badge={plan.badge || ''}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: plan.color }} />
                  <div className="pricing-card-name">{plan.name}</div>
                </div>
                <div className="pricing-card-desc">{PLAN_FEATURES[plan.id][0].text} · {PLAN_FEATURES[plan.id][1].text}</div>

                <div className="pricing-price">
                  <span className="pricing-price-amount">${Math.floor(price(plan))}</span>
                  <span className="pricing-price-period">/mo</span>
                </div>
                <div className="pricing-annual-note">
                  {interval === 'annual'
                    ? `$${plan.annual}/year — save $${plan.savings}`
                    : ' '}
                </div>

                <div className="pricing-divider" />

                <ul className="pricing-features">
                  {PLAN_FEATURES[plan.id].map((f, i) => (
                    <li key={i} className={`pricing-feature ${f.available ? '' : 'locked'}`}>
                      <span className="pricing-feature-icon"><CheckIcon available={f.available} /></span>
                      {f.text}
                    </li>
                  ))}
                </ul>

                <button
                  className={`pricing-cta ${isPopular ? 'primary' : 'outline'}`}
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={isCurrentPlan || !!checkoutLoading}
                >
                  {checkoutLoading === plan.id
                    ? 'Redirecting...'
                    : isCurrentPlan
                    ? '✓ Current Plan'
                    : `Get ${plan.name}`}
                </button>
              </div>
            );
          })}
        </div>

        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text3)' }}>
          Cancel anytime · Secure checkout via Stripe & PayPal · All prices in USD
        </div>
      </div>
    </>
  );
}

// ─── BILLING MANAGEMENT PAGE ──────────────────────────────────────────────────
export function BillingManagement({ subscription, history, onManageStripe, onCancel, onUpgrade }) {
  const [canceling, setCanceling] = useState(false);

  const handleCancel = async () => {
    if (!window.confirm('Are you sure? You\'ll keep access until the end of your billing period.')) return;
    setCanceling(true);
    try {
      await onCancel();
    } finally {
      setCanceling(false);
    }
  };

  if (!subscription?.active) {
    return (
      <div style={{ padding: '40px 28px', maxWidth: 680 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 28, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
          <div style={{ fontFamily: 'var(--font-d)', fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>No Active Plan</div>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20 }}>Subscribe to unlock all features and AI generation.</div>
          <button className="btn btn-primary" onClick={onUpgrade}>View Plans</button>
        </div>
      </div>
    );
  }

  const isUnlimited = subscription.usage?.unlimited;
  const usagePct = subscription.usage?.ai_generations_percent || 0;
  const barColor = usagePct >= 90 ? 'var(--red)' : usagePct >= 70 ? 'var(--amber)' : 'var(--accent)';

  return (
    <>
      <style>{BILLING_STYLES}</style>
      <div className="page">
        <div className="billing-panel">
          {/* Current Plan */}
          <div className="billing-section">
            <div className="billing-section-title">Current Plan</div>
            <div className="current-plan-badge">
              <div className="current-plan-name">{subscription.tier?.charAt(0).toUpperCase() + subscription.tier?.slice(1)}</div>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>{subscription.interval}</span>
              <span style={{ fontSize: 11, background: 'var(--green-d)', color: 'var(--green)', padding: '1px 6px', borderRadius: 4, marginLeft: 4 }}>Active</span>
            </div>

            {subscription.cancel_at_period_end && (
              <div style={{ background: 'var(--amber-d)', border: '1px solid rgba(245,158,11,.25)', borderRadius: 'var(--r-sm)', padding: '10px 14px', fontSize: 12.5, color: 'var(--amber)', marginBottom: 14 }}>
                ⚠️ Your subscription cancels on {new Date(subscription.current_period_end).toLocaleDateString()}. You'll keep access until then.
              </div>
            )}

            <div className="stat-row">
              <span className="stat-k">Billing Cycle</span>
              <span className="stat-v">{subscription.interval === 'annual' ? 'Annual' : 'Monthly'}</span>
            </div>
            <div className="stat-row">
              <span className="stat-k">Next Billing Date</span>
              <span className="stat-v">{subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : '—'}</span>
            </div>
            <div className="stat-row">
              <span className="stat-k">Payment Method</span>
              <span className="stat-v">{subscription.provider === 'stripe' ? '💳 Credit Card' : '🅿️ PayPal'}</span>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              {subscription.provider === 'stripe' && (
                <button className="btn btn-ghost" onClick={onManageStripe}>
                  Manage Payment & Invoices →
                </button>
              )}
              <button className="btn btn-primary btn-sm" onClick={onUpgrade}>
                Upgrade Plan
              </button>
            </div>
          </div>

          {/* AI Usage */}
          <div className="billing-section">
            <div className="billing-section-title">AI Generation Usage</div>
            {isUnlimited ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 28, fontFamily: 'var(--font-d)', fontWeight: 800, color: 'var(--green)' }}>∞</span>
                <span style={{ fontSize: 13, color: 'var(--text2)' }}>Unlimited generations on Operator plan</span>
              </div>
            ) : (
              <>
                <div className="usage-bar-wrap">
                  <div className="usage-bar-labels">
                    <span>{subscription.usage?.ai_generations} used</span>
                    <span>{subscription.usage?.ai_generations_limit} total</span>
                  </div>
                  <div className="usage-bar">
                    <div className="usage-bar-fill" style={{ width: `${Math.min(usagePct, 100)}%`, background: barColor }} />
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                  {subscription.usage?.ai_generations_limit - subscription.usage?.ai_generations} generations remaining this month.
                  {subscription.usage?.reset_date && ` Resets ${new Date(subscription.usage.reset_date).toLocaleDateString()}.`}
                </div>
                {usagePct >= 80 && (
                  <div style={{ marginTop: 12 }}>
                    <button className="btn btn-primary btn-sm" onClick={onUpgrade}>
                      Get More Generations →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Payment History */}
          {history?.length > 0 && (
            <div className="billing-section">
              <div className="billing-section-title">Payment History</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Date', 'Amount', 'Status', 'Provider'].map(h => (
                      <th key={h} style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text3)', padding: '0 0 10px', textAlign: 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontSize: 12.5, color: 'var(--text2)', padding: '8px 0', borderTop: '1px solid var(--border)' }}>{new Date(p.created_at).toLocaleDateString()}</td>
                      <td style={{ fontSize: 12.5, color: 'var(--text)', fontWeight: 600, padding: '8px 0', borderTop: '1px solid var(--border)' }}>${p.amount.toFixed(2)} {p.currency}</td>
                      <td style={{ padding: '8px 0', borderTop: '1px solid var(--border)' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, background: p.status === 'succeeded' ? 'var(--green-d)' : 'var(--red-d)', color: p.status === 'succeeded' ? 'var(--green)' : 'var(--red)', padding: '2px 6px', borderRadius: 4 }}>
                          {p.status}
                        </span>
                      </td>
                      <td style={{ fontSize: 12.5, color: 'var(--text3)', padding: '8px 0', borderTop: '1px solid var(--border)' }}>{p.provider}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Danger Zone */}
          {!subscription.cancel_at_period_end && (
            <div className="billing-section" style={{ borderColor: 'rgba(239,68,68,.2)' }}>
              <div className="billing-section-title" style={{ color: 'var(--red)' }}>Cancel Subscription</div>
              <div style={{ fontSize: 12.5, color: 'var(--text3)', marginBottom: 14 }}>
                You'll keep full access until {subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : 'end of billing period'}. Your data is saved.
              </div>
              <button className="btn btn-danger" onClick={handleCancel} disabled={canceling}>
                {canceling ? 'Canceling...' : 'Cancel Subscription'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── UPGRADE PROMPT (shown when limit is hit) ─────────────────────────────────
export function UpgradePrompt({ reason, currentTier, onUpgrade, onClose }) {
  const messages = {
    generation_limit_reached: {
      icon: '⚡',
      title: 'Generation Limit Reached',
      sub: `You've used all your AI generations for this month. Upgrade to keep creating.`,
      features: currentTier === 'starter' ? [
        'Get 300 AI generations/month',
        'Unlock video generation',
        'Unlock voice generation',
        'Run up to 5 brands',
        'Full analytics suite',
      ] : [
        'Unlimited AI generations',
        'Unlimited brands',
        'Priority processing',
        'Agency cloning system',
        'Full operator toolkit',
      ],
    },
    ai_type_not_allowed: {
      icon: '🎬',
      title: 'Unlock This Feature',
      sub: 'Video and voice generation are available on Pro and Operator plans.',
      features: [
        'Video generation (Runway ML)',
        'Voice generation (ElevenLabs)',
        '300 AI generations/month',
        'All 6 system modules',
        'Advanced analytics',
      ],
    },
    tier_required: {
      icon: '🔒',
      title: 'Upgrade to Access',
      sub: 'This feature is available on higher tier plans.',
      features: [
        'Multi-brand dashboard',
        'Funnel map + CTA routing',
        'Campaign planner',
        'Revenue calculator',
        'Advanced KPI tracking',
      ],
    },
  };

  const msg = messages[reason] || messages.tier_required;

  return (
    <>
      <style>{BILLING_STYLES}</style>
      <div className="upgrade-prompt-overlay" onClick={onClose}>
        <div className="upgrade-prompt" onClick={e => e.stopPropagation()}>
          <div className="upgrade-prompt-icon">{msg.icon}</div>
          <div className="upgrade-prompt-title">{msg.title}</div>
          <div className="upgrade-prompt-sub">{msg.sub}</div>
          <div className="upgrade-prompt-features">
            {msg.features.map((f, i) => (
              <div className="upgrade-feature" key={i}>
                <span className="upgrade-feature-check">✓</span>
                {f}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button className="btn btn-ghost" onClick={onClose}>Not now</button>
            <button className="btn btn-primary" onClick={onUpgrade}>
              {currentTier === 'starter' ? 'Upgrade to Pro →' : 'Upgrade to Operator →'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── SUCCESS SCREEN ───────────────────────────────────────────────────────────
export function SuccessScreen({ tier, onContinue }) {
  return (
    <>
      <style>{BILLING_STYLES}</style>
      <div className="success-screen">
        <div className="success-card">
          <div className="success-icon">🎉</div>
          <div className="success-title">You're in.</div>
          <div className="success-sub">
            Welcome to Content Command Center OS{tier ? ` ${tier.charAt(0).toUpperCase() + tier.slice(1)}` : ''}. Your system is ready. Time to build a content business.
          </div>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }} onClick={onContinue}>
            Open Command Center →
          </button>
        </div>
      </div>
    </>
  );
}
