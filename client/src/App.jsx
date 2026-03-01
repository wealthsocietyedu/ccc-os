// client/src/App.jsx
import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';
import * as api from './lib/api.js';
import { PricingPage, BillingManagement, UpgradePrompt, SuccessScreen } from './pages/Billing.jsx';

// ─── AUTH CONTEXT ─────────────────────────────────────────────────────────────
const AuthCtx = createContext(null);
const useAuth = () => useContext(AuthCtx);

// ─── APP STATE CONTEXT ────────────────────────────────────────────────────────
const AppCtx = createContext(null);
const useApp = () => useContext(AppCtx);

// ─── ICONS ────────────────────────────────────────────────────────────────────
const I = ({ n, s = 16, c = "" }) => {
  const icons = {
    dashboard: "M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z",
    strategy: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z",
    production: "M14.5 10c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5S16 2.67 16 3.5v5c0 .83-.67 1.5-1.5 1.5z M9.5 14c.83 0 1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5S8 21.33 8 20.5v-5c0-.83.67-1.5 1.5-1.5z",
    distribution: "M18 5a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-12 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm12 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M8.59 13.51l6.83 3.98M15.41 6.51L8.59 10.49",
    data: "M18 20V10M12 20V4M6 20v-6",
    money: "M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
    plus: "M12 5v14M5 12h14",
    eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
    users: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
    zap: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
    trending: "M23 6l-9.5 9.5-5-5L1 18 M17 6h6v6",
    check: "M20 6L9 17l-5-5",
    x: "M18 6L6 18M6 6l12 12",
    edit: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z",
    trash: "M3 6h18 M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
    calendar: "M3 4h18v18H3z M16 2v4M8 2v4M3 10h18",
    target: "M22 12A10 10 0 1 1 12 2 M22 12a6 6 0 1 1-6-6 M22 12a2 2 0 1 1-2-2",
    chevron: "M6 9l6 6 6-6",
    chevronR: "M9 18l6-6-6-6",
    funnel: "M22 3H2l8 9.46V19l4 2v-8.54z",
    route: "M3 3h6l2 2h10 M9 5v14 M3 21h6",
    link: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71 M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
    alert: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01",
    refresh: "M23 4v6h-6 M1 20v-6h6 M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
    logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9",
    shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
    review: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8",
  };
  const d = icons[n];
  if (!d) return <span style={{ fontSize: s, lineHeight: 1 }}>•</span>;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={c}
      style={{ flexShrink: 0 }}>
      {d.split(' M').map((seg, i) => (
        <path key={i} d={i === 0 ? seg : 'M' + seg} />
      ))}
    </svg>
  );
};

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #07070f; --bg2: #0c0c1a; --bg3: #111120;
    --surface: #14142a; --surface2: #1c1c32;
    --border: rgba(255,255,255,0.055); --border2: rgba(255,255,255,0.1);
    --text: #eeeef8; --text2: #9494b8; --text3: #555578;
    --accent: #6C47FF; --accent2: #8f72ff; --accent3: rgba(108,71,255,0.12);
    --green: #22c55e; --green-d: rgba(34,197,94,0.12);
    --red: #ef4444; --red-d: rgba(239,68,68,0.12);
    --amber: #f59e0b; --amber-d: rgba(245,158,11,0.12);
    --cyan: #22d3ee; --cyan-d: rgba(34,211,238,0.12);
    --font-d: 'Syne', sans-serif; --font-b: 'DM Sans', sans-serif;
    --r: 12px; --r-sm: 8px;
  }
  html, body, #root { height: 100%; background: var(--bg); color: var(--text); font-family: var(--font-b); font-size: 14px; }
  ::-webkit-scrollbar { width: 3px; height: 3px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--surface2); border-radius: 2px; }

  /* ── Layout ── */
  .app { display: flex; height: 100vh; overflow: hidden; }
  .sidebar { width: 216px; flex-shrink: 0; background: var(--bg2); border-right: 1px solid var(--border); display: flex; flex-direction: column; overflow: hidden; }
  .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
  .page { flex: 1; overflow-y: auto; padding: 24px 28px; }

  /* ── Sidebar ── */
  .s-logo { padding: 22px 18px 18px; border-bottom: 1px solid var(--border); }
  .s-logo-eyebrow { font-size: 10px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--text3); margin-bottom: 3px; }
  .s-logo-title { font-family: var(--font-d); font-size: 14px; font-weight: 800; color: var(--text); line-height: 1.25; }
  .s-logo-accent { color: var(--accent2); }
  .s-nav { flex: 1; padding: 6px 0; overflow-y: auto; }
  .s-section { font-size: 9.5px; font-weight: 700; letter-spacing: .13em; text-transform: uppercase; color: var(--text3); padding: 14px 18px 5px; }
  .s-item { display: flex; align-items: center; gap: 9px; padding: 8px 10px 8px 18px; cursor: pointer; color: var(--text3); font-size: 13px; font-weight: 500; border-left: 2px solid transparent; transition: color .13s, background .13s; }
  .s-item:hover { color: var(--text2); background: rgba(255,255,255,0.025); }
  .s-item.active { color: var(--text); background: var(--accent3); border-left-color: var(--accent); }
  .s-item.active svg { color: var(--accent2); }
  .s-footer { padding: 14px; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 8px; }

  /* ── Brand Selector ── */
  .brand-sel { margin: 14px; background: var(--surface); border: 1px solid var(--border2); border-radius: var(--r-sm); padding: 9px 11px; cursor: pointer; display: flex; align-items: center; gap: 9px; transition: border-color .15s; position: relative; }
  .brand-sel:hover { border-color: var(--accent); }
  .b-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .brand-sel-name { font-size: 13px; font-weight: 600; color: var(--text); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .brand-dd { position: absolute; top: calc(100% + 6px); left: 0; right: 0; background: var(--bg2); border: 1px solid var(--border2); border-radius: var(--r); z-index: 200; box-shadow: 0 16px 40px rgba(0,0,0,.6); animation: fadeDown .14s ease; }
  .brand-opt { display: flex; align-items: center; gap: 9px; padding: 11px 13px; cursor: pointer; transition: background .1s; }
  .brand-opt:hover { background: var(--surface); }
  .brand-opt.sel { background: var(--accent3); }

  /* ── Topbar ── */
  .topbar { height: 54px; flex-shrink: 0; background: var(--bg2); border-bottom: 1px solid var(--border); display: flex; align-items: center; padding: 0 24px; gap: 14px; }
  .topbar-title { font-family: var(--font-d); font-size: 15px; font-weight: 700; color: var(--text); flex: 1; }
  .topbar-sub { color: var(--text3); font-size: 12px; font-weight: 400; margin-left: 8px; }
  .topbar-acts { display: flex; align-items: center; gap: 8px; }

  /* ── Buttons ── */
  .btn { padding: 7px 14px; border-radius: var(--r-sm); font-family: var(--font-b); font-size: 12.5px; font-weight: 600; cursor: pointer; border: none; transition: all .13s; display: inline-flex; align-items: center; gap: 6px; }
  .btn-ghost { background: none; border: 1px solid var(--border2); color: var(--text2); }
  .btn-ghost:hover { border-color: var(--border); color: var(--text); background: rgba(255,255,255,0.03); }
  .btn-primary { background: var(--accent); color: white; }
  .btn-primary:hover { background: var(--accent2); }
  .btn-sm { padding: 5px 10px; font-size: 11.5px; }
  .btn-icon { width: 30px; height: 30px; padding: 0; justify-content: center; }
  .btn-danger { background: var(--red-d); color: var(--red); border: 1px solid rgba(239,68,68,.25); }
  .btn-danger:hover { background: var(--red); color: white; }

  /* ── KPI Grid ── */
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 24px; }
  .kpi-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); padding: 18px; position: relative; overflow: hidden; transition: border-color .15s; }
  .kpi-card:hover { border-color: var(--border2); }
  .kpi-glow { position: absolute; top: -10px; right: -10px; width: 70px; height: 70px; border-radius: 50%; opacity: .13; filter: blur(24px); pointer-events: none; }
  .kpi-label { font-size: 10.5px; font-weight: 600; letter-spacing: .1em; text-transform: uppercase; color: var(--text3); margin-bottom: 7px; }
  .kpi-val { font-family: var(--font-d); font-size: 26px; font-weight: 800; color: var(--text); line-height: 1; margin-bottom: 5px; }
  .kpi-delta { font-size: 11.5px; font-weight: 500; }
  .kpi-icon { position: absolute; top: 16px; right: 16px; opacity: .18; }

  /* ── Panels ── */
  .panel { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); padding: 18px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 24px; }
  .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 24px; }
  .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }

  /* ── Section Headers ── */
  .sec-hdr { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
  .sec-title { font-family: var(--font-d); font-size: 13px; font-weight: 700; color: var(--text); display: flex; align-items: center; gap: 7px; }
  .sec-title svg { color: var(--accent2); }

  /* ── Badges ── */
  .badge { display: inline-flex; align-items: center; gap: 3px; font-size: 10px; font-weight: 600; border-radius: 4px; padding: 2px 6px; white-space: nowrap; }
  .badge-format { background: var(--cyan-d); color: var(--cyan); }
  .badge-plat { background: rgba(255,255,255,0.05); color: var(--text3); }
  .badge-tofu { background: var(--accent3); color: var(--accent2); }
  .badge-mofu { background: var(--amber-d); color: var(--amber); }
  .badge-bofu { background: var(--green-d); color: var(--green); }
  .badge-scale { background: var(--green-d); color: var(--green); }
  .badge-refine { background: var(--amber-d); color: var(--amber); }
  .badge-kill { background: var(--red-d); color: var(--red); }
  .tag { display: inline-flex; align-items: center; padding: 2px 7px; background: rgba(255,255,255,0.045); border-radius: 20px; font-size: 11px; color: var(--text3); font-weight: 500; }

  /* ── Pipeline Board ── */
  .pipeline { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin-bottom: 24px; }
  .pipe-col { background: var(--surface); border-radius: var(--r); overflow: hidden; }
  .pipe-col-hdr { padding: 10px 12px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
  .pipe-col-lbl { font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--text3); }
  .pipe-col-cnt { font-size: 10.5px; font-weight: 700; background: var(--surface2); color: var(--text3); border-radius: 20px; padding: 1px 6px; }
  .pipe-cards { padding: 8px; display: flex; flex-direction: column; gap: 6px; min-height: 60px; }
  .pipe-card { background: var(--bg3); border: 1px solid var(--border); border-radius: var(--r-sm); padding: 9px 10px; cursor: pointer; transition: border-color .13s, transform .1s; }
  .pipe-card:hover { border-color: var(--accent); transform: translateY(-1px); }
  .pipe-card-title { font-size: 11.5px; font-weight: 500; color: var(--text); line-height: 1.4; margin-bottom: 6px; }
  .pipe-card-meta { display: flex; flex-wrap: wrap; gap: 4px; }

  /* ── Tables ── */
  .data-table { width: 100%; border-collapse: collapse; }
  .data-table th { font-size: 9.5px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--text3); padding: 0 12px 10px; text-align: left; white-space: nowrap; }
  .data-table td { font-size: 12.5px; color: var(--text2); padding: 9px 12px; border-top: 1px solid var(--border); }
  .data-table tr:hover td { background: rgba(255,255,255,0.018); }
  .data-table td:first-child { color: var(--text); font-weight: 500; }

  /* ── Forms / Modals ── */
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.72); backdrop-filter: blur(5px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px; }
  .modal { background: var(--bg2); border: 1px solid var(--border2); border-radius: 16px; padding: 26px; width: 100%; max-width: 500px; max-height: 92vh; overflow-y: auto; animation: fadeUp .18s ease; }
  .modal-lg { max-width: 700px; }
  .modal-title { font-family: var(--font-d); font-size: 17px; font-weight: 800; color: var(--text); margin-bottom: 18px; }
  .form-row { margin-bottom: 14px; }
  .form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
  .form-label { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--text3); display: block; margin-bottom: 5px; }
  .form-input, .form-select, .form-textarea { width: 100%; background: var(--surface); border: 1px solid var(--border2); border-radius: var(--r-sm); padding: 9px 11px; font-family: var(--font-b); font-size: 13.5px; color: var(--text); outline: none; transition: border-color .13s; }
  .form-input:focus, .form-select:focus, .form-textarea:focus { border-color: var(--accent); }
  .form-select { cursor: pointer; }
  .form-textarea { resize: vertical; min-height: 72px; line-height: 1.5; }
  .modal-acts { display: flex; gap: 8px; margin-top: 18px; justify-content: flex-end; }

  /* ── Tabs ── */
  .tabs { display: flex; gap: 3px; background: var(--surface); border-radius: var(--r-sm); padding: 3px; width: fit-content; margin-bottom: 18px; }
  .tab { padding: 5px 13px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; color: var(--text3); transition: all .13s; border: none; background: none; font-family: var(--font-b); }
  .tab.active { background: var(--bg); color: var(--text); box-shadow: 0 1px 4px rgba(0,0,0,.35); }

  /* ── Auth Screen ── */
  .auth-screen { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--bg); padding: 20px; }
  .auth-card { background: var(--bg2); border: 1px solid var(--border2); border-radius: 18px; padding: 36px; width: 100%; max-width: 420px; }
  .auth-logo { font-family: var(--font-d); font-size: 22px; font-weight: 800; color: var(--text); margin-bottom: 6px; }
  .auth-logo span { color: var(--accent2); }
  .auth-sub { font-size: 13px; color: var(--text3); margin-bottom: 28px; }
  .auth-tabs { display: flex; gap: 0; margin-bottom: 22px; border-bottom: 1px solid var(--border); }
  .auth-tab { padding: 8px 18px; font-size: 13px; font-weight: 600; cursor: pointer; color: var(--text3); border: none; background: none; font-family: var(--font-b); border-bottom: 2px solid transparent; transition: all .13s; margin-bottom: -1px; }
  .auth-tab.active { color: var(--accent2); border-bottom-color: var(--accent); }
  .auth-error { background: var(--red-d); border: 1px solid rgba(239,68,68,.25); border-radius: var(--r-sm); padding: 10px 14px; font-size: 13px; color: var(--red); margin-bottom: 14px; }

  /* ── Distribution Room ── */
  .funnel-card { background: var(--bg3); border: 1px solid var(--border); border-radius: var(--r); padding: 16px; margin-bottom: 12px; }
  .funnel-steps { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-top: 14px; }
  .funnel-step { background: var(--surface); border-radius: var(--r-sm); padding: 10px 12px; }
  .funnel-step-lbl { font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .1em; color: var(--text3); margin-bottom: 5px; }
  .funnel-step-val { font-size: 12px; color: var(--text); font-weight: 500; line-height: 1.4; }

  .cta-route-row { display: flex; align-items: center; gap: 12px; padding: 12px 14px; background: var(--bg3); border: 1px solid var(--border); border-radius: var(--r-sm); margin-bottom: 8px; }
  .cta-stage-badge { width: 48px; text-align: center; }
  .cta-route-info { flex: 1; }
  .cta-route-label { font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 3px; }
  .cta-route-copy { font-size: 11.5px; color: var(--text3); font-style: italic; }
  .cta-route-dest { font-size: 12px; color: var(--cyan); max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .orphan-alert { background: rgba(245,158,11,.08); border: 1px solid rgba(245,158,11,.25); border-radius: var(--r); padding: 14px 18px; margin-bottom: 18px; display: flex; align-items: flex-start; gap: 12px; }
  .orphan-all-clear { background: var(--green-d); border: 1px solid rgba(34,197,94,.25); }

  .platform-row { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--border); }
  .platform-row:last-child { border-bottom: none; }
  .platform-name { font-size: 13px; font-weight: 600; color: var(--text); width: 88px; }
  .pbar-wrap { flex: 1; }
  .pbar-meta { display: flex; justify-content: space-between; font-size: 10.5px; color: var(--text3); margin-bottom: 4px; }
  .pbar { height: 3px; background: var(--surface2); border-radius: 2px; overflow: hidden; }
  .pbar-fill { height: 100%; border-radius: 2px; transition: width .6s ease; }
  .pgrowth { font-size: 11.5px; font-weight: 600; min-width: 44px; text-align: right; }

  /* ── Data / Analytics ── */
  .stat-row { display: flex; justify-content: space-between; align-items: center; padding: 7px 0; border-bottom: 1px solid var(--border); }
  .stat-row:last-child { border-bottom: none; }
  .stat-k { font-size: 12.5px; color: var(--text2); }
  .stat-v { font-size: 13px; font-weight: 700; color: var(--text); font-family: var(--font-d); }
  .stat-v.green { color: var(--green); }
  .stat-v.accent { color: var(--accent2); }
  .stat-v.cyan { color: var(--cyan); }

  /* ── Performer rows ── */
  .performer-row { display: flex; align-items: center; gap: 11px; padding: 9px 0; border-bottom: 1px solid var(--border); cursor: pointer; }
  .performer-row:last-child { border-bottom: none; }
  .performer-rank { font-family: var(--font-d); font-size: 15px; font-weight: 800; color: var(--text3); width: 22px; }
  .performer-info { flex: 1; min-width: 0; }
  .performer-title { font-size: 12px; font-weight: 500; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .performer-meta { font-size: 10.5px; color: var(--text3); margin-top: 1px; }
  .performer-score { font-family: var(--font-d); font-size: 17px; font-weight: 800; color: var(--accent2); }

  /* ── Revenue calc ── */
  .calc-result { background: linear-gradient(135deg, rgba(108,71,255,.14), rgba(108,71,255,.04)); border: 1px solid rgba(108,71,255,.28); border-radius: var(--r); padding: 20px; text-align: center; margin-bottom: 14px; }
  .calc-big { font-family: var(--font-d); font-size: 44px; font-weight: 800; color: var(--accent2); line-height: 1; }
  .calc-lbl { font-size: 11.5px; color: var(--text3); margin-top: 4px; }

  /* ── Review steps ── */
  .review-step { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); padding: 18px; margin-bottom: 12px; }
  .review-step-hdr { display: flex; align-items: center; gap: 11px; margin-bottom: 12px; }
  .review-step-num { width: 26px; height: 26px; background: var(--accent); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: var(--font-d); font-size: 12px; font-weight: 800; color: white; flex-shrink: 0; }
  .review-step-title { font-size: 13.5px; font-weight: 700; color: var(--text); }
  .review-step-time { font-size: 10.5px; color: var(--text3); margin-left: auto; }
  .review-textarea { width: 100%; background: var(--bg3); border: 1px solid var(--border2); border-radius: var(--r-sm); padding: 10px 12px; font-family: var(--font-b); font-size: 12.5px; color: var(--text); outline: none; resize: vertical; min-height: 80px; line-height: 1.55; }
  .review-textarea:focus { border-color: var(--accent); }
  .review-textarea::placeholder { color: var(--text3); }

  /* ── Hook cards ── */
  .hook-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .hook-card { background: var(--bg3); border: 1px solid var(--border); border-radius: var(--r-sm); padding: 12px; cursor: pointer; transition: border-color .13s; }
  .hook-card:hover { border-color: var(--accent); }
  .hook-card.winner { border-color: rgba(34,197,94,.28); }
  .hook-text { font-size: 12.5px; font-weight: 500; color: var(--text); line-height: 1.5; margin-bottom: 9px; }
  .hook-meta { display: flex; align-items: center; justify-content: space-between; }
  .hook-score { font-family: var(--font-d); font-size: 19px; font-weight: 800; color: var(--accent2); }
  .hook-score.hi { color: var(--green); }

  /* ── Misc ── */
  .divider { height: 1px; background: var(--border); margin: 18px 0; }
  .empty { text-align: center; padding: 36px; color: var(--text3); font-size: 12.5px; }
  .loading { display: flex; align-items: center; justify-content: center; height: 120px; color: var(--text3); font-size: 13px; gap: 10px; }

  /* ── Campaign row ── */
  .campaign-row { display: flex; align-items: center; gap: 14px; padding: 12px 16px; background: var(--bg3); border: 1px solid var(--border); border-radius: var(--r-sm); margin-bottom: 8px; }
  .campaign-info { flex: 1; }
  .campaign-name { font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 3px; }
  .campaign-dates { font-size: 11px; color: var(--text3); }
  .cprog { width: 140px; }
  .cprog-lbl { display: flex; justify-content: space-between; font-size: 10.5px; color: var(--text3); margin-bottom: 4px; }
  .cbar { height: 5px; background: var(--surface2); border-radius: 3px; overflow: hidden; }
  .cbar-fill { height: 100%; border-radius: 3px; background: var(--accent); }
  .camp-rev { font-family: var(--font-d); font-size: 16px; font-weight: 700; color: var(--green); text-align: right; }

  /* ── Offer row ── */
  .offer-row { display: flex; align-items: center; gap: 12px; padding: 11px 15px; background: var(--bg3); border: 1px solid var(--border); border-radius: var(--r-sm); margin-bottom: 8px; }
  .offer-name { flex: 1; font-size: 13px; font-weight: 600; color: var(--text); }
  .offer-price { font-family: var(--font-d); font-size: 17px; font-weight: 800; color: var(--green); }
  .status-dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; flex-shrink: 0; }
  .s-active { background: var(--green); box-shadow: 0 0 5px var(--green); }
  .s-inactive { background: var(--text3); }

  /* ── Pillar item ── */
  .pillar-item { display: flex; align-items: center; gap: 11px; padding: 10px 13px; background: var(--bg3); border: 1px solid var(--border); border-radius: var(--r-sm); margin-bottom: 7px; cursor: pointer; transition: border-color .13s; }
  .pillar-item:hover { border-color: var(--accent); }
  .pillar-bar { width: 3px; height: 30px; border-radius: 2px; flex-shrink: 0; }
  .pillar-name { font-size: 13px; font-weight: 600; color: var(--text); flex: 1; }

  /* ── Animations ── */
  @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes spin { to { transform: rotate(360deg); } }
  .spin { animation: spin 1s linear infinite; }
`;

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const fmt = (n) => { if (n >= 1e6) return (n/1e6).toFixed(1)+'M'; if (n >= 1e3) return (n/1e3).toFixed(1)+'K'; return String(n||0); };
const money = (n) => '$' + (n||0).toLocaleString();
const engRate = (p) => p.views > 0 ? ((p.likes+p.comments+p.shares+p.saves)/p.views*100).toFixed(1) : '0.0';
const perfScore = (p) => {
  if (!p || !p.views) return 0;
  const er = (p.likes+p.comments+p.shares+p.saves)/p.views*100;
  return (Math.min(p.views/100000,1)*30 + Math.min(er/10,1)*30 + Math.min((p.followers||0)/500,1)*20 + Math.min((p.leads||0)/100,1)*20).toFixed(1);
};
const STATUS_C = { Idea:'#555578', Approved:'#6C47FF', Scripted:'#22d3ee', Filming:'#f59e0b', Editing:'#f59e0b', Review:'#8f72ff', Scheduled:'#3b82f6', Published:'#22c55e', Repurposed:'#a855f7' };
const PILLAR_C = ['#6C47FF','#FF6B35','#22d3ee','#22c55e','#f59e0b','#e879f9','#fb7185','#34d399'];

// ─── AUTH SCREEN ──────────────────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = mode === 'login'
        ? await api.auth.login(form.email, form.password)
        : await api.auth.register(form.name, form.email, form.password);
      localStorage.setItem('ccc_token', res.token);
      onAuth(res.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-logo">Content <span>Command Center</span></div>
        <div className="auth-sub">The operating system for content businesses.</div>
        <div className="auth-tabs">
          {['login','register'].map(m => (
            <button key={m} className={`auth-tab ${mode===m?'active':''}`} onClick={() => { setMode(m); setError(''); }}>
              {m === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={submit}>
          {mode === 'register' && (
            <div className="form-row">
              <label className="form-label">Your Name</label>
              <input className="form-input" placeholder="Levi Acay" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
            </div>
          )}
          <div className="form-row">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" placeholder="you@example.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
          </div>
          <div className="form-row">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" placeholder={mode === 'register' ? 'Min 8 characters' : '••••••••'} value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
          </div>
          <button className="btn btn-primary" type="submit" style={{ width:'100%', justifyContent:'center', marginTop: 6 }} disabled={loading}>
            {loading ? '...' : mode === 'login' ? 'Sign In' : 'Create Account & Start'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── BRAND SELECTOR ───────────────────────────────────────────────────────────
function BrandSelector({ brands, activeBrand, onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  if (!activeBrand) return null;
  return (
    <div style={{ position:'relative', margin:'12px 14px' }} ref={ref}>
      <div className="brand-sel" onClick={() => setOpen(!open)}>
        <div className="b-dot" style={{ background: activeBrand.color }} />
        <div className="brand-sel-name">{activeBrand.name}</div>
        <I n="chevron" s={13} />
      </div>
      {open && (
        <div className="brand-dd">
          {brands.map(b => (
            <div key={b.id} className={`brand-opt ${b.id===activeBrand.id?'sel':''}`}
              onClick={() => { onSelect(b); setOpen(false); }}>
              <div className="b-dot" style={{ background: b.color }} />
              <div>
                <div style={{ fontSize:12.5, fontWeight:600, color:'var(--text)' }}>{b.name}</div>
                <div style={{ fontSize:11, color:'var(--text3)' }}>{b.type}</div>
              </div>
              {b.id===activeBrand.id && <I n="check" s={13} c="" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── QUICK ADD MODAL ──────────────────────────────────────────────────────────
function QuickAddModal({ activeBrand, pillars, onClose, onSave }) {
  const [type, setType] = useState('idea');
  const [form, setForm] = useState({ title:'', format:'Short Form Video', priority:'High', status:'Raw Idea' });
  const [loading, setLoading] = useState(false);

  const save = async () => {
    if (!form.title.trim()) return;
    setLoading(true);
    try {
      if (type === 'idea') {
        await api.production.ideas.create({ brand_id: activeBrand.id, ...form });
      } else if (type === 'hook') {
        await api.production.hooks.create({ brand_id: activeBrand.id, text: form.title, type: 'Curiosity Gap', emotion: 'Curiosity' });
      } else {
        await api.production.assets.create({ brand_id: activeBrand.id, title: form.title, format: form.format, platform: 'TikTok', status: 'Idea', funnel_stage: 'TOFU' });
      }
      onSave();
      onClose();
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">Quick Add</div>
        <div className="tabs">
          {['idea','hook','asset'].map(t => <button key={t} className={`tab ${type===t?'active':''}`} onClick={() => setType(t)}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>)}
        </div>
        <div className="form-row">
          <label className="form-label">{type==='hook'?'Hook Text':'Title'}</label>
          <input className="form-input" placeholder={type==='hook'?'The opening line...':'Working title...'} value={form.title} onChange={e => setForm({...form,title:e.target.value})} autoFocus />
        </div>
        {type !== 'hook' && (
          <div className="form-row">
            <label className="form-label">Format</label>
            <select className="form-select" value={form.format} onChange={e => setForm({...form,format:e.target.value})}>
              {['Short Form Video','Carousel','Thread','Long Form','Story'].map(f => <option key={f}>{f}</option>)}
            </select>
          </div>
        )}
        <div className="modal-acts">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={loading}>{loading?'Saving...':'Add'}</button>
        </div>
      </div>
    </div>
  );
}

// ─── PIPELINE BOARD ───────────────────────────────────────────────────────────
function PipelineBoard({ assets, onCardClick }) {
  const COLS = ['Idea','Scripted','Filming','Scheduled','Published','Repurposed'];
  return (
    <div className="pipeline">
      {COLS.map(col => {
        const cards = assets.filter(a => a.status === col);
        return (
          <div className="pipe-col" key={col}>
            <div className="pipe-col-hdr">
              <span className="pipe-col-lbl">{col}</span>
              <span className="pipe-col-cnt">{cards.length}</span>
            </div>
            <div className="pipe-cards">
              {cards.slice(0,5).map(c => (
                <div className="pipe-card" key={c.id} onClick={() => onCardClick && onCardClick(c)}>
                  <div className="pipe-card-title">{c.title}</div>
                  <div className="pipe-card-meta">
                    <span className="badge badge-format">{c.format}</span>
                    <span className="badge badge-plat">{c.platform}</span>
                    {c.funnel_stage && <span className={`badge badge-${c.funnel_stage.toLowerCase()}`}>{c.funnel_stage}</span>}
                  </div>
                </div>
              ))}
              {cards.length===0 && <div style={{color:'var(--text3)',fontSize:10.5,textAlign:'center',padding:'10px 0'}}>Empty</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── COMMAND CENTER ───────────────────────────────────────────────────────────
function CommandCenter({ activeBrand, setPage }) {
  const [assets, setAssets] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [platformStats, setPlatformStats] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeBrand) return;
    setLoading(true);
    Promise.all([
      api.production.assets.list({ brandId: activeBrand.id }),
      api.data.analytics(activeBrand.id, 30),
      api.distribution.platformStats.list(activeBrand.id),
      api.data.campaigns.list(activeBrand.id, 'Active'),
    ]).then(([a, an, ps, c]) => {
      setAssets(a); setAnalytics(an); setPlatformStats(ps); setCampaigns(c);
    }).finally(() => setLoading(false));
  }, [activeBrand?.id]);

  if (loading) return <div className="page"><div className="loading"><I n="refresh" s={16} c="spin" /> Loading dashboard...</div></div>;

  const tot = analytics?.totals || {};

  return (
    <div className="page">
      {/* KPI Row */}
      <div className="kpi-grid">
        {[
          { label:'Total Views', val: fmt(tot.total_views||0), delta:'+23% this week', up:true, icon:'eye', glow:'#6C47FF' },
          { label:'New Followers', val: fmt(tot.total_followers||0), delta:'+8.4% growth', up:true, icon:'users', glow:'#22d3ee' },
          { label:'Leads Generated', val: fmt(tot.total_leads||0), delta:'Last 30 days', up:true, icon:'target', glow:'#22c55e' },
          { label:'Est. Revenue', val: money(tot.total_revenue||0), delta:'This month', up:true, icon:'money', glow:'#f59e0b' },
        ].map(k => (
          <div className="kpi-card" key={k.label}>
            <div className="kpi-glow" style={{ background: k.glow }} />
            <div className="kpi-icon"><I n={k.icon} s={26} /></div>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-val">{k.val}</div>
            <div className="kpi-delta" style={{ color: k.up ? 'var(--green)' : 'var(--red)' }}>{k.up?'↑':'↓'} {k.delta}</div>
          </div>
        ))}
      </div>

      {/* Pipeline */}
      <div className="sec-hdr">
        <div className="sec-title"><I n="production" s={14} /> Production Pipeline</div>
        <button className="btn btn-ghost btn-sm" onClick={() => setPage('production')}><I n="arrow" s={12} /> View All</button>
      </div>
      <PipelineBoard assets={assets} />

      <div className="grid-2">
        {/* Platform Tracker */}
        <div className="panel">
          <div className="sec-hdr"><div className="sec-title"><I n="distribution" s={14} /> Platform Tracker</div></div>
          {platformStats.map(p => {
            const prog = Math.round((p.published_this_week / Math.max(p.target_per_week,1)) * 100);
            const growth = p.followers_start > 0 ? ((p.followers_current - p.followers_start) / p.followers_start * 100).toFixed(1) : '0.0';
            return (
              <div className="platform-row" key={p.id}>
                <div className="platform-name">{p.platform}</div>
                <div className="pbar-wrap">
                  <div className="pbar-meta">
                    <span>{p.published_this_week}/{p.target_per_week} posts</span>
                    <span>{fmt(p.followers_current)} followers</span>
                  </div>
                  <div className="pbar"><div className="pbar-fill" style={{ width:`${Math.min(prog,100)}%`, background: prog>=100?'var(--green)':'var(--accent)' }} /></div>
                </div>
                <div className="pgrowth" style={{ color: parseFloat(growth)>=0?'var(--green)':'var(--red)' }}>+{growth}%</div>
              </div>
            );
          })}
          {platformStats.length===0 && <div className="empty">No platforms configured yet.</div>}
        </div>

        {/* Top Performers */}
        <div className="panel">
          <div className="sec-hdr"><div className="sec-title"><I n="trending" s={14} /> Top Performers</div><span style={{ fontSize:10.5, color:'var(--text3)' }}>By score</span></div>
          {(analytics?.top_performers||[]).slice(0,5).map((p,i) => (
            <div className="performer-row" key={p.id}>
              <div className="performer-rank">#{i+1}</div>
              <div className="performer-info">
                <div className="performer-title">{p.title}</div>
                <div className="performer-meta">{p.platform} · {p.format} · {fmt(p.views)} views</div>
              </div>
              <div className="performer-score">{p.score}</div>
            </div>
          ))}
          {!analytics?.top_performers?.length && <div className="empty">Log performance data to see top performers.</div>}
        </div>
      </div>

      {/* Active Campaigns */}
      {campaigns.length > 0 && <>
        <div className="sec-hdr"><div className="sec-title"><I n="target" s={14} /> Active Campaigns</div></div>
        {campaigns.map(c => {
          const prog = Math.round((c.pieces_planned > 0 ? 60 : 0));
          return (
            <div className="campaign-row" key={c.id}>
              <div className="campaign-info">
                <div className="campaign-name">{c.name}</div>
                <div className="campaign-dates">{c.type} · {c.start_date} → {c.end_date}</div>
              </div>
              <div className="cprog">
                <div className="cprog-lbl"><span>{c.pieces_planned} pieces</span><span>{prog}%</span></div>
                <div className="cbar"><div className="cbar-fill" style={{ width:`${prog}%` }} /></div>
              </div>
              <div className="camp-rev">{money(c.revenue_goal)}</div>
            </div>
          );
        })}
      </>}
    </div>
  );
}

// ─── DISTRIBUTION ROOM ────────────────────────────────────────────────────────
function DistributionRoom({ activeBrand }) {
  const [tab, setTab] = useState('funnels');
  const [funnels, setFunnels] = useState([]);
  const [ctaRoutes, setCtaRoutes] = useState([]);
  const [platformStats, setPlatformStats] = useState([]);
  const [orphanData, setOrphanData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addFunnel, setAddFunnel] = useState(false);
  const [addCta, setAddCta] = useState(false);
  const [funnelForm, setFunnelForm] = useState({ name:'', entry_point:'', micro_conversion:'', lead_capture:'', nurture_step:'', conversion_step:'' });
  const [ctaForm, setCtaForm] = useState({ label:'', cta_copy:'', destination_url:'', funnel_stage:'TOFU' });

  const load = useCallback(async () => {
    if (!activeBrand) return;
    setLoading(true);
    try {
      const [f, cta, ps, orphans] = await Promise.all([
        api.distribution.funnels.list(activeBrand.id),
        api.distribution.ctaRoutes.list({ brandId: activeBrand.id }),
        api.distribution.platformStats.list(activeBrand.id),
        api.distribution.orphanCheck(activeBrand.id),
      ]);
      setFunnels(f); setCtaRoutes(cta); setPlatformStats(ps); setOrphanData(orphans);
    } catch(e) { console.error(e); }
    setLoading(false);
  }, [activeBrand?.id]);

  useEffect(() => { load(); }, [load]);

  const saveFunnel = async () => {
    await api.distribution.funnels.create({ brand_id: activeBrand.id, ...funnelForm });
    setAddFunnel(false);
    setFunnelForm({ name:'', entry_point:'', micro_conversion:'', lead_capture:'', nurture_step:'', conversion_step:'' });
    load();
  };

  const saveCta = async () => {
    await api.distribution.ctaRoutes.create({ brand_id: activeBrand.id, ...ctaForm });
    setAddCta(false);
    setCtaForm({ label:'', cta_copy:'', destination_url:'', funnel_stage:'TOFU' });
    load();
  };

  const deleteFunnel = async (id) => {
    if (!window.confirm('Delete this funnel?')) return;
    await api.distribution.funnels.delete(id);
    load();
  };

  const deleteCta = async (id) => {
    await api.distribution.ctaRoutes.delete(id);
    load();
  };

  const toggleCta = async (route) => {
    await api.distribution.ctaRoutes.update(route.id, { active: !route.active });
    load();
  };

  if (loading) return <div className="page"><div className="loading"><I n="refresh" s={16} c="spin" /> Loading...</div></div>;

  const TOFU = ctaRoutes.filter(r => r.funnel_stage === 'TOFU');
  const MOFU = ctaRoutes.filter(r => r.funnel_stage === 'MOFU');
  const BOFU = ctaRoutes.filter(r => r.funnel_stage === 'BOFU');

  return (
    <div className="page">
      {/* Orphan Alert — core Distribution Room rule */}
      {orphanData && (
        <div className={`orphan-alert ${orphanData.count === 0 ? 'orphan-all-clear' : ''}`}>
          <I n={orphanData.count === 0 ? 'check' : 'alert'} s={18}
            c="" style={{ color: orphanData.count === 0 ? 'var(--green)' : 'var(--amber)', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize:13, fontWeight:600, color: orphanData.count===0?'var(--green)':'var(--amber)', marginBottom:2 }}>
              {orphanData.count === 0 ? 'Zero Orphans — All Content Routes Attention' : `${orphanData.count} Orphan Content Piece${orphanData.count>1?'s':''} Detected`}
            </div>
            <div style={{ fontSize:12, color:'var(--text3)' }}>{orphanData.message}</div>
            {orphanData.count > 0 && (
              <div style={{ marginTop:8, display:'flex', flexWrap:'wrap', gap:6 }}>
                {orphanData.orphans.map(o => (
                  <span key={o.id} className="tag" style={{ color:'var(--amber)' }}>{o.title}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
        <div className="tabs" style={{ marginBottom:0 }}>
          {['funnels','cta-routes','platforms'].map(t => (
            <button key={t} className={`tab ${tab===t?'active':''}`} onClick={() => setTab(t)}>
              {t==='cta-routes'?'CTA Routes':t.charAt(0).toUpperCase()+t.slice(1)}
            </button>
          ))}
        </div>
        {tab==='funnels' && <button className="btn btn-primary btn-sm" onClick={() => setAddFunnel(true)}><I n="plus" s={12} /> New Funnel</button>}
        {tab==='cta-routes' && <button className="btn btn-primary btn-sm" onClick={() => setAddCta(true)}><I n="plus" s={12} /> New CTA Route</button>}
      </div>

      {/* ── Funnels Tab ── */}
      {tab === 'funnels' && (
        <>
          {funnels.map(f => (
            <div className="funnel-card" key={f.id}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:10 }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:'var(--text)', marginBottom:4 }}>{f.name}</div>
                  <div style={{ display:'flex', gap:6 }}>
                    <span className="badge badge-tofu">{f.stage}</span>
                    <span className={`tag`} style={{ color: f.active ? 'var(--green)' : 'var(--text3)' }}>
                      {f.active ? '● Active' : '○ Inactive'}
                    </span>
                  </div>
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  <button className="btn btn-ghost btn-sm btn-icon" onClick={() => deleteFunnel(f.id)}><I n="trash" s={13} /></button>
                </div>
              </div>
              <div className="funnel-steps">
                {[
                  ['Entry Point', f.entry_point],
                  ['Micro Conv.', f.micro_conversion],
                  ['Lead Capture', f.lead_capture],
                  ['Nurture', f.nurture_step],
                  ['Conversion', f.conversion_step],
                ].map(([lbl, val]) => (
                  <div className="funnel-step" key={lbl}>
                    <div className="funnel-step-lbl">{lbl}</div>
                    <div className="funnel-step-val">{val || <span style={{color:'var(--text3)'}}>—</span>}</div>
                  </div>
                ))}
              </div>
              {f.cta_routes && f.cta_routes.length > 0 && (
                <div style={{ marginTop:12, paddingTop:12, borderTop:'1px solid var(--border)' }}>
                  <div style={{ fontSize:10.5, fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--text3)', marginBottom:8 }}>CTA Routes in this Funnel</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                    {f.cta_routes.map(r => (
                      <span key={r.id} className="tag">{r.label}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
          {funnels.length === 0 && <div className="empty panel">No funnels yet. Create your first funnel map.</div>}
        </>
      )}

      {/* ── CTA Routes Tab ── */}
      {tab === 'cta-routes' && (
        <>
          {[['TOFU', TOFU], ['MOFU', MOFU], ['BOFU', BOFU]].map(([stage, routes]) => routes.length > 0 && (
            <div key={stage} style={{ marginBottom:20 }}>
              <div style={{ fontSize:10.5, fontWeight:700, textTransform:'uppercase', letterSpacing:'.12em', color:'var(--text3)', marginBottom:10 }}>
                {stage} — {stage==='TOFU'?'Awareness':'stage'==='MOFU'?'Interest':'Decision'}
              </div>
              {routes.map(r => (
                <div className="cta-route-row" key={r.id}>
                  <div className="cta-stage-badge">
                    <span className={`badge badge-${stage.toLowerCase()}`}>{stage}</span>
                  </div>
                  <div className="cta-route-info">
                    <div className="cta-route-label">{r.label}</div>
                    <div className="cta-route-copy">"{r.cta_copy}"</div>
                  </div>
                  <div className="cta-route-dest">{r.destination_url || '—'}</div>
                  <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                    <span className="status-dot" style={{ background: r.active ? 'var(--green)' : 'var(--text3)', boxShadow: r.active ? '0 0 5px var(--green)' : 'none' }} />
                    <button className="btn btn-ghost btn-sm btn-icon" onClick={() => toggleCta(r)}>
                      <I n={r.active?'check':'x'} s={12} />
                    </button>
                    <button className="btn btn-ghost btn-sm btn-icon" onClick={() => deleteCta(r.id)}><I n="trash" s={12} /></button>
                  </div>
                </div>
              ))}
            </div>
          ))}
          {ctaRoutes.length === 0 && <div className="empty panel">No CTA routes yet. Every content piece needs a destination.</div>}
        </>
      )}

      {/* ── Platforms Tab ── */}
      {tab === 'platforms' && (
        <div className="panel">
          <div className="sec-hdr"><div className="sec-title"><I n="distribution" s={14} /> Platform Publishing Tracker</div></div>
          {platformStats.map(p => {
            const prog = Math.round((p.published_this_week / Math.max(p.target_per_week,1)) * 100);
            const growth = p.followers_start > 0 ? ((p.followers_current - p.followers_start) / p.followers_start * 100).toFixed(1) : '0.0';
            return (
              <div className="platform-row" key={p.id}>
                <div className="platform-name" style={{ width:90 }}>{p.platform}</div>
                <div className="pbar-wrap">
                  <div className="pbar-meta">
                    <span>{p.published_this_week}/{p.target_per_week} posts this week</span>
                    <span>{fmt(p.followers_current)} followers</span>
                  </div>
                  <div className="pbar">
                    <div className="pbar-fill" style={{ width:`${Math.min(prog,100)}%`, background: prog>=100?'var(--green)':'var(--accent)' }} />
                  </div>
                </div>
                <div style={{ fontSize:11.5, color:'var(--text3)', minWidth:80, textAlign:'right' }}>
                  Avg {fmt(p.avg_views)} views
                </div>
                <div className="pgrowth" style={{ color: parseFloat(growth)>=0?'var(--green)':'var(--red)' }}>+{growth}%</div>
              </div>
            );
          })}
          {platformStats.length === 0 && <div className="empty">No platform data yet.</div>}
        </div>
      )}

      {/* ── Add Funnel Modal ── */}
      {addFunnel && (
        <div className="modal-overlay" onClick={() => setAddFunnel(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-title">New Funnel Map</div>
            <div className="form-row">
              <label className="form-label">Funnel Name</label>
              <input className="form-input" placeholder="e.g. Content → Lead → Sale" value={funnelForm.name} onChange={e => setFunnelForm({...funnelForm,name:e.target.value})} />
            </div>
            {[['entry_point','Entry Point','Where does cold traffic enter? (e.g. TikTok Reel)'],['micro_conversion','Micro Conversion','Small action you ask for (Follow, Save, DM)'],['lead_capture','Lead Capture','Free resource or opt-in page'],['nurture_step','Nurture Step','Email sequence, DM script, or retargeting'],['conversion_step','Conversion Step','Where money is made — sales page, checkout']].map(([k,lbl,ph]) => (
              <div className="form-row" key={k}>
                <label className="form-label">{lbl}</label>
                <input className="form-input" placeholder={ph} value={funnelForm[k]} onChange={e => setFunnelForm({...funnelForm,[k]:e.target.value})} />
              </div>
            ))}
            <div className="modal-acts">
              <button className="btn btn-ghost" onClick={() => setAddFunnel(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveFunnel}>Create Funnel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add CTA Modal ── */}
      {addCta && (
        <div className="modal-overlay" onClick={() => setAddCta(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">New CTA Route</div>
            <div className="form-row">
              <label className="form-label">Label</label>
              <input className="form-input" placeholder="e.g. Link in Bio → Free Guide" value={ctaForm.label} onChange={e => setCtaForm({...ctaForm,label:e.target.value})} />
            </div>
            <div className="form-row">
              <label className="form-label">CTA Copy (exact wording used in content)</label>
              <input className="form-input" placeholder="e.g. Comment 'guide' and I'll send it" value={ctaForm.cta_copy} onChange={e => setCtaForm({...ctaForm,cta_copy:e.target.value})} />
            </div>
            <div className="form-row">
              <label className="form-label">Destination URL / Action</label>
              <input className="form-input" placeholder="https://yourdomain.com/guide or 'Direct Message'" value={ctaForm.destination_url} onChange={e => setCtaForm({...ctaForm,destination_url:e.target.value})} />
            </div>
            <div className="form-row">
              <label className="form-label">Funnel Stage</label>
              <select className="form-select" value={ctaForm.funnel_stage} onChange={e => setCtaForm({...ctaForm,funnel_stage:e.target.value})}>
                <option>TOFU</option><option>MOFU</option><option>BOFU</option>
              </select>
            </div>
            <div className="modal-acts">
              <button className="btn btn-ghost" onClick={() => setAddCta(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveCta}>Create Route</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── STRATEGY ROOM ────────────────────────────────────────────────────────────
function StrategyRoom({ activeBrand }) {
  const [tab, setTab] = useState('pillars');
  const [pillars, setPillars] = useState([]);
  const [offers, setOffers] = useState([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name:'', type:'Authority', trigger:'Freedom', cta:'Follow' });

  useEffect(() => {
    if (!activeBrand) return;
    api.brands.pillars.list(activeBrand.id).then(setPillars);
    api.data.offers.list(activeBrand.id).then(setOffers);
  }, [activeBrand?.id]);

  const savePillar = async () => {
    if (!form.name.trim()) return;
    await api.brands.pillars.create(activeBrand.id, form);
    const p = await api.brands.pillars.list(activeBrand.id);
    setPillars(p);
    setAdding(false);
    setForm({ name:'', type:'Authority', trigger:'Freedom', cta:'Follow' });
  };

  const deletePillar = async (id) => {
    await api.brands.pillars.delete(activeBrand.id, id);
    setPillars(pillars.filter(p => p.id !== id));
  };

  return (
    <div className="page">
      <div className="tabs">
        {['pillars','brand','offers'].map(t => <button key={t} className={`tab ${tab===t?'active':''}`} onClick={() => setTab(t)}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>)}
      </div>

      {tab === 'pillars' && (
        <>
          <div className="sec-hdr">
            <div className="sec-title"><I n="strategy" s={14} /> Content Pillars</div>
            <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}><I n="plus" s={12} /> Add Pillar</button>
          </div>
          {pillars.map((p,i) => (
            <div className="pillar-item" key={p.id}>
              <div className="pillar-bar" style={{ background: PILLAR_C[i%PILLAR_C.length] }} />
              <div style={{ flex:1 }}>
                <div className="pillar-name">{p.name}</div>
                <div style={{ display:'flex', gap:6, marginTop:4 }}>
                  <span className="tag">{p.type}</span>
                  <span className="tag">🔥 {p.trigger}</span>
                  <span className="tag">→ {p.cta}</span>
                </div>
              </div>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => deletePillar(p.id)}><I n="trash" s={12} /></button>
            </div>
          ))}
          {pillars.length === 0 && <div className="empty panel">No pillars yet. Add your first content pillar.</div>}
        </>
      )}

      {tab === 'brand' && (
        <div className="panel" style={{ maxWidth:520 }}>
          <div className="modal-title" style={{ marginBottom:18 }}>Brand Configuration</div>
          {[['Brand Name',activeBrand?.name],['Type',activeBrand?.type],['Niche',activeBrand?.niche],['Primary Offer',activeBrand?.primary_offer||activeBrand?.primaryOffer],['Monthly Revenue Goal',money(activeBrand?.monthly_goal||activeBrand?.monthlyGoal||0)],['Platforms',(activeBrand?.platforms||[]).join(', ')]].map(([k,v]) => (
            <div className="stat-row" key={k}><span className="stat-k">{k}</span><span className="stat-v">{v||'—'}</span></div>
          ))}
        </div>
      )}

      {tab === 'offers' && (
        <>
          <div className="sec-hdr"><div className="sec-title"><I n="money" s={14} /> Offer Ladder</div></div>
          {offers.map(o => (
            <div className="offer-row" key={o.id}>
              <span className="status-dot s-active" />
              <div style={{ flex:1 }}>
                <div className="offer-name">{o.name}</div>
                <div style={{ display:'flex', gap:6, marginTop:4 }}>
                  <span className="tag">{o.type}</span>
                  <span className="tag">Conv. {o.conversion_rate}%</span>
                  <span className="tag">Goal: {o.monthly_units_goal}/mo</span>
                  <span className="tag" style={{ color:'var(--green)' }}>{money(o.price * o.monthly_units_goal)}/mo</span>
                </div>
              </div>
              <div className="offer-price">{money(o.price)}</div>
            </div>
          ))}
          {offers.length===0 && <div className="empty panel">No offers configured yet.</div>}
        </>
      )}

      {adding && (
        <div className="modal-overlay" onClick={() => setAdding(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">New Content Pillar</div>
            <div className="form-row">
              <label className="form-label">Pillar Name</label>
              <input className="form-input" placeholder="e.g. Mindset, Systems, Creator Income" value={form.name} onChange={e => setForm({...form,name:e.target.value})} autoFocus />
            </div>
            <div className="form-row-2">
              <div className="form-row" style={{ marginBottom:0 }}>
                <label className="form-label">Type</label>
                <select className="form-select" value={form.type} onChange={e => setForm({...form,type:e.target.value})}>
                  {['Awareness','Authority','Trust','Desire','Conversion'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-row" style={{ marginBottom:0 }}>
                <label className="form-label">Life Force Trigger</label>
                <select className="form-select" value={form.trigger} onChange={e => setForm({...form,trigger:e.target.value})}>
                  {['Freedom','Power','Security','Social Approval','Survival','Legacy','Experience'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <label className="form-label">Default CTA</label>
              <select className="form-select" value={form.cta} onChange={e => setForm({...form,cta:e.target.value})}>
                {['Follow','DM','Link in Bio','Lead Magnet','Purchase','Email List'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="modal-acts">
              <button className="btn btn-ghost" onClick={() => setAdding(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={savePillar}>Create Pillar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PRODUCTION ROOM ──────────────────────────────────────────────────────────
function ProductionRoom({ activeBrand }) {
  const [tab, setTab] = useState('pipeline');
  const [assets, setAssets] = useState([]);
  const [ideas, setIdeas] = useState([]);
  const [hooks, setHooks] = useState([]);
  const [pillars, setPillars] = useState([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title:'', format:'Short Form Video', platform:'TikTok', status:'Idea', funnel_stage:'TOFU', hook:'', cta:'', pillar_id:'' });

  useEffect(() => {
    if (!activeBrand) return;
    Promise.all([
      api.production.assets.list({ brandId: activeBrand.id }),
      api.production.ideas.list({ brandId: activeBrand.id }),
      api.production.hooks.list({ brandId: activeBrand.id }),
      api.brands.pillars.list(activeBrand.id),
    ]).then(([a,i,h,p]) => { setAssets(a); setIdeas(i); setHooks(h); setPillars(p); });
  }, [activeBrand?.id]);

  const saveAsset = async () => {
    if (!form.title.trim()) return;
    await api.production.assets.create({ brand_id: activeBrand.id, ...form });
    const a = await api.production.assets.list({ brandId: activeBrand.id });
    setAssets(a);
    setAdding(false);
    setForm({ title:'', format:'Short Form Video', platform:'TikTok', status:'Idea', funnel_stage:'TOFU', hook:'', cta:'', pillar_id:'' });
  };

  return (
    <div className="page">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
        <div className="tabs" style={{ marginBottom:0 }}>
          {['pipeline','ideas','hooks'].map(t => <button key={t} className={`tab ${tab===t?'active':''}`} onClick={() => setTab(t)}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>)}
        </div>
        {tab !== 'hooks' && <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}><I n="plus" s={12} /> New {tab === 'pipeline' ? 'Asset' : 'Idea'}</button>}
      </div>

      {tab === 'pipeline' && (
        <>
          <PipelineBoard assets={assets} />
          <div className="panel">
            <div className="sec-title" style={{ marginBottom:14 }}>All Assets ({assets.length})</div>
            <table className="data-table">
              <thead><tr><th>Title</th><th>Format</th><th>Platform</th><th>Status</th><th>Stage</th><th>Scheduled</th></tr></thead>
              <tbody>
                {assets.map(a => (
                  <tr key={a.id}>
                    <td style={{ maxWidth:240, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.title}</td>
                    <td><span className="badge badge-format">{a.format}</span></td>
                    <td><span className="tag">{a.platform}</span></td>
                    <td><span className="badge" style={{ background:`${STATUS_C[a.status]||'#555'}22`, color:STATUS_C[a.status]||'#888' }}>{a.status}</span></td>
                    <td><span className={`badge badge-${(a.funnel_stage||'tofu').toLowerCase()}`}>{a.funnel_stage}</span></td>
                    <td style={{ color:'var(--text3)' }}>{a.scheduled_date||'—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {assets.length === 0 && <div className="empty">No assets yet.</div>}
          </div>
        </>
      )}

      {tab === 'ideas' && (
        <div className="panel">
          <table className="data-table">
            <thead><tr><th>Idea</th><th>Format</th><th>Priority</th><th>Status</th></tr></thead>
            <tbody>
              {ideas.map(i => (
                <tr key={i.id}>
                  <td>{i.title}</td>
                  <td><span className="badge badge-format">{i.format}</span></td>
                  <td><span className="tag" style={{ color: i.priority==='High'?'var(--green)':i.priority==='Medium'?'var(--amber)':'var(--text3)' }}>{i.priority}</span></td>
                  <td><span className="badge" style={{ background:`${STATUS_C[i.status]||'#555'}22`, color:STATUS_C[i.status]||'#888' }}>{i.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {ideas.length === 0 && <div className="empty">No ideas yet.</div>}
        </div>
      )}

      {tab === 'hooks' && (
        <div className="hook-grid">
          {hooks.map(h => (
            <div className={`hook-card ${h.status==='Winner'?'winner':''}`} key={h.id}>
              <div className="hook-text">"{h.text}"</div>
              <div className="hook-meta">
                <div style={{ display:'flex', gap:5 }}>
                  <span className="tag">{h.type}</span>
                  <span className="tag">{h.emotion}</span>
                  {h.status==='Winner' && <span className="badge badge-scale">Winner</span>}
                </div>
                <div className={`hook-score ${parseFloat(h.score)>=9?'hi':''}`}>{h.score}</div>
              </div>
            </div>
          ))}
          {hooks.length === 0 && <div className="empty">No hooks yet.</div>}
        </div>
      )}

      {adding && (
        <div className="modal-overlay" onClick={() => setAdding(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">New Content Asset</div>
            <div className="form-row">
              <label className="form-label">Title</label>
              <input className="form-input" placeholder="Working title" value={form.title} onChange={e => setForm({...form,title:e.target.value})} autoFocus />
            </div>
            <div className="form-row">
              <label className="form-label">Hook</label>
              <input className="form-input" placeholder="Opening line or concept" value={form.hook} onChange={e => setForm({...form,hook:e.target.value})} />
            </div>
            <div className="form-row-2">
              <div className="form-row" style={{ marginBottom:0 }}>
                <label className="form-label">Format</label>
                <select className="form-select" value={form.format} onChange={e => setForm({...form,format:e.target.value})}>
                  {['Short Form Video','Carousel','Thread','Long Form','Story','Email'].map(f => <option key={f}>{f}</option>)}
                </select>
              </div>
              <div className="form-row" style={{ marginBottom:0 }}>
                <label className="form-label">Platform</label>
                <select className="form-select" value={form.platform} onChange={e => setForm({...form,platform:e.target.value})}>
                  {['TikTok','Instagram','Twitter','YouTube','LinkedIn'].map(f => <option key={f}>{f}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row-2">
              <div className="form-row" style={{ marginBottom:0 }}>
                <label className="form-label">Funnel Stage</label>
                <select className="form-select" value={form.funnel_stage} onChange={e => setForm({...form,funnel_stage:e.target.value})}>
                  {['TOFU','MOFU','BOFU'].map(f => <option key={f}>{f}</option>)}
                </select>
              </div>
              <div className="form-row" style={{ marginBottom:0 }}>
                <label className="form-label">Pillar</label>
                <select className="form-select" value={form.pillar_id} onChange={e => setForm({...form,pillar_id:e.target.value})}>
                  <option value="">None</option>
                  {pillars.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <label className="form-label">CTA</label>
              <input className="form-input" placeholder="e.g. Link in bio for the free guide" value={form.cta} onChange={e => setForm({...form,cta:e.target.value})} />
            </div>
            <div className="modal-acts">
              <button className="btn btn-ghost" onClick={() => setAdding(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveAsset}>Create Asset</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── DATA ROOM ────────────────────────────────────────────────────────────────
function DataRoom({ activeBrand }) {
  const [tab, setTab] = useState('performance');
  const [analytics, setAnalytics] = useState(null);
  const [period, setPeriod] = useState(30);
  const [reviewNotes, setReviewNotes] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeBrand) return;
    setLoading(true);
    api.data.analytics(activeBrand.id, period).then(setAnalytics).finally(() => setLoading(false));
  }, [activeBrand?.id, period]);

  if (loading) return <div className="page"><div className="loading"><I n="refresh" s={16} c="spin" /> Loading analytics...</div></div>;

  const tot = analytics?.totals || {};

  return (
    <div className="page">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
        <div className="tabs" style={{ marginBottom:0 }}>
          {['performance','analytics','weekly'].map(t => <button key={t} className={`tab ${tab===t?'active':''}`} onClick={() => setTab(t)}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>)}
        </div>
        {tab !== 'weekly' && (
          <select className="form-select" style={{ width:120 }} value={period} onChange={e => setPeriod(Number(e.target.value))}>
            {[7,14,30,90].map(d => <option key={d} value={d}>Last {d}d</option>)}
          </select>
        )}
      </div>

      {tab === 'performance' && (
        <>
          <div className="grid-4">
            {[['Eng. Rate', tot.engagement_rate+'%', 'accent'],['Posts', tot.posts, ''],['Total Leads', tot.total_leads, 'green'],['Revenue', money(tot.total_revenue), 'green']].map(([k,v,c]) => (
              <div className="panel" key={k} style={{ textAlign:'center' }}>
                <div style={{ fontSize:10.5, color:'var(--text3)', marginBottom:8, fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em' }}>{k}</div>
                <div className={`stat-v ${c}`} style={{ fontSize:20 }}>{v}</div>
              </div>
            ))}
          </div>
          <div className="panel">
            <div className="sec-title" style={{ marginBottom:14 }}>Performance Log</div>
            <table className="data-table">
              <thead><tr><th>Content</th><th>Platform</th><th>Views</th><th>Eng. Rate</th><th>Leads</th><th>Score</th><th>Decision</th></tr></thead>
              <tbody>
                {(analytics?.top_performers||[]).map(p => (
                  <tr key={p.id}>
                    <td style={{ maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.title}</td>
                    <td>{p.platform}</td>
                    <td>{fmt(p.views)}</td>
                    <td style={{ color: parseFloat(engRate(p))>=4?'var(--green)':parseFloat(engRate(p))>=2?'var(--amber)':'var(--red)' }}>{engRate(p)}%</td>
                    <td>{p.leads}</td>
                    <td style={{ color:'var(--accent2)', fontFamily:'var(--font-d)', fontWeight:700 }}>{p.score}</td>
                    <td>{p.decision?<span className={`badge badge-${p.decision.toLowerCase()}`}>{p.decision}</span>:'—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!analytics?.top_performers?.length && <div className="empty">No published content with performance data yet.</div>}
          </div>
        </>
      )}

      {tab === 'analytics' && (
        <div className="grid-2">
          <div className="panel">
            <div className="sec-title" style={{ marginBottom:14 }}>By Platform</div>
            {(analytics?.by_platform||[]).map(p => (
              <div key={p.platform}>
                <div className="stat-row"><span className="stat-k" style={{ fontWeight:600 }}>{p.platform}</span><span className="stat-v">{fmt(p.views)} views</span></div>
                <div className="stat-row"><span className="stat-k" style={{ paddingLeft:12, fontSize:11.5 }}>Posts</span><span className="stat-v" style={{ fontSize:12 }}>{p.posts}</span></div>
                <div className="stat-row"><span className="stat-k" style={{ paddingLeft:12, fontSize:11.5 }}>Leads</span><span className="stat-v green" style={{ fontSize:12 }}>{p.leads}</span></div>
              </div>
            ))}
            {!analytics?.by_platform?.length && <div className="empty">No data yet.</div>}
          </div>
          <div className="panel">
            <div className="sec-title" style={{ marginBottom:14 }}>By Content Pillar</div>
            {(analytics?.by_pillar||[]).map(p => (
              <div className="stat-row" key={p.id}>
                <span className="stat-k">{p.name}</span>
                <span style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:11, color:'var(--text3)' }}>{p.posts} posts</span>
                  <span className="stat-v accent">{(p.avg_eng_rate||0).toFixed(1)}%</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'weekly' && (
        <div style={{ maxWidth:600 }}>
          {[
            { num:1, title:'Clear Idea Vault', time:'2 min', content: (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                {['Approved','Kill','Someday'].map(s => (
                  <div key={s} style={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'var(--r-sm)', padding:'8px 12px', textAlign:'center' }}>
                    <div style={{ fontSize:10.5, color:'var(--text3)', marginBottom:3 }}>{s}</div>
                    <div style={{ fontFamily:'var(--font-d)', fontSize:18, fontWeight:800, color:'var(--text)' }}>—</div>
                  </div>
                ))}
              </div>
            )},
            { num:2, title:"Review Last Week's Performance", time:'5 min', content: (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {[['Total Views',fmt(tot.total_views||0)],['Leads',tot.total_leads||0],['Avg Eng Rate',(tot.engagement_rate||0)+'%'],['Posts Published',tot.posts||0]].map(([k,v]) => (
                  <div key={k} style={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'var(--r-sm)', padding:'10px 13px' }}>
                    <div style={{ fontSize:10.5, color:'var(--text3)', marginBottom:3 }}>{k}</div>
                    <div style={{ fontFamily:'var(--font-d)', fontSize:20, fontWeight:800, color:'var(--text)' }}>{v}</div>
                  </div>
                ))}
              </div>
            )},
            { num:3, title:'Make Scale / Refine / Kill Decisions', time:'3 min', content: (
              <div>
                {['Scale','Refine','Kill'].map(d => (
                  <div key={d} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 0', borderBottom:'1px solid var(--border)' }}>
                    <span className={`badge badge-${d.toLowerCase()}`} style={{ minWidth:52, justifyContent:'center' }}>{d}</span>
                    <span style={{ fontSize:12, color:'var(--text3)' }}>Review top performers and assign decisions in the Performance tab.</span>
                  </div>
                ))}
              </div>
            )},
            { num:4, title:'Plan Next Week', time:'5 min', content: (
              <textarea className="review-textarea" value={reviewNotes} onChange={e => setReviewNotes(e.target.value)} placeholder="Posts planned, priority pillar, batch day, platforms to focus on..." />
            )},
          ].map(step => (
            <div className="review-step" key={step.num}>
              <div className="review-step-hdr">
                <div className="review-step-num">{step.num}</div>
                <div className="review-step-title">{step.title}</div>
                <div className="review-step-time">{step.time}</div>
              </div>
              {step.content}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MONETIZATION ROOM ────────────────────────────────────────────────────────
function MonetizationRoom({ activeBrand }) {
  const [offers, setOffers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [rev, setRev] = useState(10000);
  const [price, setPrice] = useState(249);
  const [conv, setConv] = useState(2);
  const [ctaR, setCtaR] = useState(3);
  const [avgV, setAvgV] = useState(20000);

  useEffect(() => {
    if (!activeBrand) return;
    api.data.offers.list(activeBrand.id).then(setOffers);
    api.data.campaigns.list(activeBrand.id).then(setCampaigns);
  }, [activeBrand?.id]);

  const units = rev / price;
  const leads = Math.ceil(units / (conv/100));
  const views = Math.ceil(leads / (ctaR/100));
  const posts = Math.ceil(views / avgV);

  return (
    <div className="page">
      <div className="grid-2">
        <div className="panel">
          <div className="sec-title" style={{ marginBottom:18 }}><I n="target" s={14} /> Revenue Calculator</div>
          {[['Monthly Revenue Goal ($)',rev,setRev],['Price Per Unit ($)',price,setPrice],['Conversion Rate (%)',conv,setConv],['CTA Click Rate (%)',ctaR,setCtaR],['Avg Views Per Post',avgV,setAvgV]].map(([lbl,val,setter]) => (
            <div key={lbl} style={{ marginBottom:13 }}>
              <div className="form-label">{lbl}</div>
              <input className="form-input" type="number" value={val} onChange={e => setter(parseFloat(e.target.value)||0)} />
            </div>
          ))}
        </div>
        <div>
          <div className="calc-result">
            <div style={{ fontSize:11, color:'var(--text3)', marginBottom:7, textTransform:'uppercase', letterSpacing:'.1em', fontWeight:600 }}>Posts Required Per Month</div>
            <div className="calc-big">{posts}</div>
            <div className="calc-lbl">to hit {money(rev)}/mo</div>
          </div>
          <div className="panel">
            <div className="sec-title" style={{ marginBottom:12 }}>The Math Chain</div>
            {[['Revenue Goal',money(rev)],['Units Needed',Math.ceil(units)],['Leads Required',fmt(leads)],['Views Required',fmt(views)],['Posts/Month',posts],['Posts/Week',Math.ceil(posts/4.3)]].map(([k,v]) => (
              <div className="stat-row" key={k}><span className="stat-k">{k}</span><span className="stat-v accent">{v}</span></div>
            ))}
          </div>
        </div>
      </div>

      <div className="sec-hdr"><div className="sec-title"><I n="money" s={14} /> Offer Ladder</div></div>
      {offers.map(o => (
        <div className="offer-row" key={o.id}>
          <span className="status-dot s-active" />
          <div style={{ flex:1 }}>
            <div className="offer-name">{o.name}</div>
            <div style={{ display:'flex', gap:6, marginTop:4 }}>
              <span className="tag">{o.type}</span>
              <span className="tag">Conv. {o.conversion_rate}%</span>
              <span className="tag">Goal: {o.monthly_units_goal}/mo</span>
              <span className="tag" style={{ color:'var(--green)' }}>{money(o.price*o.monthly_units_goal)}/mo</span>
            </div>
          </div>
          <div className="offer-price">{money(o.price)}</div>
        </div>
      ))}

      {campaigns.length > 0 && <>
        <div className="sec-hdr" style={{ marginTop:20 }}><div className="sec-title"><I n="calendar" s={14} /> Campaigns</div></div>
        {campaigns.map(c => (
          <div className="campaign-row" key={c.id}>
            <div className="campaign-info">
              <div className="campaign-name">{c.name}</div>
              <div className="campaign-dates">{c.type} · {c.start_date} → {c.end_date}</div>
            </div>
            <div className="cprog">
              <div className="cprog-lbl"><span>{c.pieces_planned} pieces</span><span>{c.status}</span></div>
              <div className="cbar"><div className="cbar-fill" style={{ width:'60%' }} /></div>
            </div>
            <div className="camp-rev">{money(c.revenue_goal)}</div>
          </div>
        ))}
      </>}
    </div>
  );
}

// ─── SCHEDULER ROOM ───────────────────────────────────────────────────────────
const PLATFORM_DEFS = [
  { id:'youtube',   name:'YouTube Shorts', icon:'▶', color:'#ff4444', comingSoon:false },
  { id:'instagram', name:'Instagram Reels',icon:'📷', color:'#e1306c', comingSoon:false },
  { id:'facebook',  name:'Facebook Reels', icon:'ⓕ', color:'#1877f2', comingSoon:false },
  { id:'linkedin',  name:'LinkedIn',        icon:'in', color:'#0a66c2', comingSoon:false },
  { id:'tiktok',    name:'TikTok',          icon:'♪', color:'#ffffff', comingSoon:true },
  { id:'pinterest', name:'Pinterest',        icon:'P', color:'#e60023', comingSoon:true },
];

const DEST_META = {
  youtube:   { label:'YT',  color:'#ff4444', bg:'rgba(255,0,0,.12)' },
  instagram: { label:'IG',  color:'#e1306c', bg:'rgba(225,48,108,.12)' },
  facebook:  { label:'FB',  color:'#1877f2', bg:'rgba(24,119,242,.12)' },
  linkedin:  { label:'LI',  color:'#0a66c2', bg:'rgba(10,102,194,.12)' },
  tiktok:    { label:'TT',  color:'#ffffff', bg:'rgba(255,255,255,.08)' },
};

function DestBadge({ id }) {
  const m = DEST_META[id] || { label:id, color:'var(--text3)', bg:'var(--surface2)' };
  return (
    <span style={{ display:'inline-flex', alignItems:'center', padding:'2px 7px', borderRadius:20, fontSize:10, fontWeight:700, color:m.color, background:m.bg, border:`1px solid ${m.color}33` }}>
      {m.label}
    </span>
  );
}

function SchedulerRoom({ activeBrand }) {
  const [tab, setTab] = useState('queue');
  const [connections, setConnections] = useState([]);
  const [posts, setPosts] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [connecting, setConnecting] = useState(null);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({ title:'', caption:'', format:'Short Form Video', scheduledDate:'', scheduledTime:'09:00', dests:[] });

  const showToast = (msg, type='green') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [conns, wflows] = await Promise.all([
        api.scheduler.platforms.list(),
        api.scheduler.workflows.list(),
      ]);
      setConnections(conns);
      setWorkflows(wflows);
      if (activeBrand) {
        const p = await api.scheduler.posts.list(activeBrand.id);
        setPosts(p);
      }
    } catch(e) { console.error(e); }
    setLoading(false);
  }, [activeBrand?.id]);

  useEffect(() => { load(); }, [load]);

  const handleConnect = async (platformId) => {
    setConnecting(platformId);
    try {
      const { oauth_url } = await api.scheduler.platforms.getOAuthUrl(platformId);
      // Open OAuth popup
      const popup = window.open(oauth_url, 'oauth', 'width=500,height=700,left=300,top=100');
      // Poll for callback
      const poll = setInterval(() => {
        if (popup?.closed) {
          clearInterval(poll);
          setConnecting(null);
          load(); // Refresh connections
          showToast(`Platform connected successfully`, 'green');
        }
      }, 800);
    } catch(e) {
      setConnecting(null);
      showToast('Connection failed — check API keys are configured', 'red');
    }
  };

  const handleDisconnect = async (platformId) => {
    await api.scheduler.platforms.disconnect(platformId);
    load();
    showToast('Platform disconnected');
  };

  const handleAddPost = async () => {
    if (!form.title.trim()) return showToast('Add a title', 'amber');
    if (!form.dests.length) return showToast('Select at least one platform', 'amber');
    if (!form.scheduledDate) return showToast('Set a date', 'amber');
    const scheduledAt = `${form.scheduledDate}T${form.scheduledTime}:00`;
    try {
      await api.scheduler.posts.create({
        brand_id: activeBrand?.id,
        title: form.title,
        caption: form.caption,
        format: form.format,
        destinations: form.dests,
        scheduled_at: scheduledAt,
      });
      setForm({ title:'', caption:'', format:'Short Form Video', scheduledDate:'', scheduledTime:'09:00', dests:[] });
      setShowAdd(false);
      load();
      showToast('✓ Post scheduled', 'green');
    } catch(e) { showToast('Failed to schedule post', 'red'); }
  };

  const handlePublishNow = async (postId, title) => {
    try {
      setPosts(p => p.map(x => x.id===postId ? {...x, status:'publishing'} : x));
      const result = await api.scheduler.posts.publishNow(postId);
      load();
      showToast(`✓ "${title.slice(0,28)}..." published to ${result.results?.filter(r=>r.success).length || 0} platforms`, 'green');
    } catch(e) { showToast('Publish failed', 'red'); }
  };

  const handleDeletePost = async (id) => {
    await api.scheduler.posts.delete(id);
    load();
  };

  const handleToggleWorkflow = async (id, currentActive) => {
    await api.scheduler.workflows.update(id, { active: !currentActive });
    load();
  };

  const handleDeleteWorkflow = async (id) => {
    await api.scheduler.workflows.delete(id);
    load();
  };

  const toggleDest = (id) => {
    setForm(f => ({
      ...f,
      dests: f.dests.includes(id) ? f.dests.filter(d=>d!==id) : [...f.dests, id]
    }));
  };

  if (loading) return <div className="page"><div className="loading"><I n="refresh" s={16} c="spin" /> Loading scheduler...</div></div>;

  const connectedPlatforms = PLATFORM_DEFS.filter(p => connections.find(c => c.platform===p.id && c.connected));
  const queued = posts.filter(p => p.status === 'queued').length;
  const published = posts.filter(p => p.status === 'published').length;
  const today = new Date();
  const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  // Build week calendar
  const weekDays = Array.from({length:7}, (_,i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - today.getDay() + i);
    return d;
  });

  return (
    <div className="page">
      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed', bottom:24, right:24, zIndex:9999, background: toast.type==='green'?'var(--green-d)':toast.type==='amber'?'var(--amber-d)':'var(--red-d)', border:`1px solid ${toast.type==='green'?'var(--green)':toast.type==='amber'?'var(--amber)':'var(--red)'}`, color:toast.type==='green'?'var(--green)':toast.type==='amber'?'var(--amber)':'var(--red)', padding:'10px 18px', borderRadius:'var(--r-sm)', fontSize:13, fontWeight:600, animation:'fadeUp .2s ease', boxShadow:'0 8px 24px rgba(0,0,0,.5)' }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--text3)', marginBottom:4 }}>Distribution Layer</div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:11.5, color: connectedPlatforms.length>0?'var(--green)':'var(--amber)', fontWeight:600 }}>
              {connectedPlatforms.length>0 ? `● ${connectedPlatforms.length} platform${connectedPlatforms.length>1?'s':''} live` : '○ No platforms connected yet'}
            </span>
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-ghost" onClick={() => setTab('connect')}>
            <I n="plus" s={13} /> Connect Platform
          </button>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <I n="calendar" s={13} /> Schedule Post
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom:20 }}>
        {[
          ['Queued', queued, 'var(--accent2)', 'calendar'],
          ['Published', published, 'var(--green)', 'check'],
          ['Connected', connectedPlatforms.length, 'var(--cyan)', 'link'],
          ['Workflows', workflows.filter(w=>w.active).length, 'var(--amber)', 'zap'],
        ].map(([lbl,val,col,icon]) => (
          <div className="panel" key={lbl} style={{ textAlign:'center', padding:'16px 12px' }}>
            <I n={icon} s={18} style={{ color:col, marginBottom:8, display:'block', margin:'0 auto 8px' }} />
            <div style={{ fontFamily:'var(--font-d)', fontSize:26, fontWeight:800, color:col, lineHeight:1, marginBottom:4 }}>{val}</div>
            <div style={{ fontSize:10.5, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.08em', fontWeight:600 }}>{lbl}</div>
          </div>
        ))}
      </div>

      {/* Calendar strip */}
      <div className="sec-hdr"><div className="sec-title"><I n="calendar" s={13} /> This Week</div></div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:6, marginBottom:22 }}>
        {weekDays.map((d,i) => {
          const isToday = d.toDateString() === today.toDateString();
          const dayPosts = posts.filter(p => {
            const pd = new Date(p.scheduled_at);
            return pd.toDateString() === d.toDateString();
          });
          return (
            <div key={i} style={{ background: isToday?'var(--accent3)':'var(--surface)', border:`1px solid ${isToday?'var(--accent)':'var(--border)'}`, borderRadius:'var(--r-sm)', padding:'8px 6px', textAlign:'center', minHeight:72 }}>
              <div style={{ fontSize:9.5, fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em', color:'var(--text3)', marginBottom:3 }}>{DAYS[d.getDay()]}</div>
              <div style={{ fontFamily:'var(--font-d)', fontSize:17, fontWeight:800, color: isToday?'var(--accent2)':'var(--text)', marginBottom:5 }}>{d.getDate()}</div>
              <div style={{ display:'flex', gap:2, justifyContent:'center', flexWrap:'wrap' }}>
                {dayPosts.slice(0,3).map((_,j) => (
                  <div key={j} style={{ width:5, height:5, borderRadius:'50%', background:['#ff4444','#e1306c','#22c55e'][j%3] }} />
                ))}
              </div>
              {dayPosts.length > 0 && <div style={{ fontSize:9, color:'var(--text3)', marginTop:3 }}>{dayPosts.length} post{dayPosts.length>1?'s':''}</div>}
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="tabs">
        {[['queue','📋 Queue'],['workflows','⚡ Workflows'],['connect','🔌 Platforms']].map(([t,lbl]) => (
          <button key={t} className={`tab ${tab===t?'active':''}`} onClick={() => setTab(t)}>{lbl}</button>
        ))}
      </div>

      {/* ── Queue Tab ── */}
      {tab === 'queue' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 280px', gap:20, alignItems:'start' }}>
          <div>
            <div className="sec-hdr">
              <div className="sec-title">Publishing Queue</div>
              <span style={{ fontSize:11, color:'var(--text3)' }}>{posts.length} posts total</span>
            </div>
            {posts.length === 0 && (
              <div className="panel empty">
                No posts scheduled yet. Click "Schedule Post" to add your first one.
              </div>
            )}
            {posts.map(post => {
              const sTime = new Date(post.scheduled_at);
              const timeStr = sTime.toLocaleDateString('en-US',{month:'short',day:'numeric'}) + ' · ' + sTime.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
              const STATUS_COLOR = { queued:'var(--text3)', publishing:'var(--amber)', published:'var(--green)', failed:'var(--red)', partial:'var(--amber)' };
              const STATUS_ICON = { queued:'·', publishing:'↑', published:'✓', failed:'✗', partial:'⚠' };
              return (
                <div key={post.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background:'var(--surface)', border:`1px solid ${post.status==='published'?'rgba(34,197,94,.2)':post.status==='failed'?'rgba(239,68,68,.2)':'var(--border)'}`, borderRadius:'var(--r-sm)', marginBottom:8, opacity:post.status==='published'?.65:1, transition:'border-color .15s' }}>
                  <div style={{ width:40, height:40, borderRadius:8, background:'var(--surface2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                    🎬
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12.5, fontWeight:600, color:'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', marginBottom:5 }}>{post.title}</div>
                    <div style={{ display:'flex', gap:5, alignItems:'center', flexWrap:'wrap' }}>
                      <span className="tag" style={{ fontSize:10 }}>{post.format}</span>
                      {post.destinations.map(d => <DestBadge key={d} id={d} />)}
                    </div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontSize:11.5, color:'var(--text2)', fontWeight:500, marginBottom:4 }}>{timeStr}</div>
                    <div style={{ display:'flex', gap:5, justifyContent:'flex-end' }}>
                      {post.status === 'queued' && (
                        <button className="btn btn-ghost btn-sm" style={{ fontSize:10.5, padding:'3px 9px' }} onClick={() => handlePublishNow(post.id, post.title)}>
                          Publish Now
                        </button>
                      )}
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={() => handleDeletePost(post.id)}><I n="trash" s={11} /></button>
                    </div>
                  </div>
                  <div style={{ width:22, height:22, borderRadius:'50%', background: post.status==='published'?'var(--green-d)':post.status==='publishing'?'var(--amber-d)':post.status==='failed'?'var(--red-d)':'var(--surface2)', color:STATUS_COLOR[post.status]||'var(--text3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0 }}>
                    {STATUS_ICON[post.status]||'·'}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right sidebar */}
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div className="panel">
              <div className="sec-title" style={{ marginBottom:12, fontSize:12 }}>Best Times to Post</div>
              {[['IG Reels / TikTok','6–9 AM, 7–9 PM'],['YouTube Shorts','12–3 PM, 8–11 PM'],['LinkedIn','8–10 AM Tue–Thu'],['Facebook','1–4 PM Wed–Fri']].map(([p,t]) => (
                <div key={p} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid var(--border)', fontSize:11.5 }}>
                  <span style={{ color:'var(--text)', fontWeight:500 }}>{p}</span>
                  <span style={{ color:'var(--text3)' }}>{t}</span>
                </div>
              ))}
            </div>
            <div className="panel">
              <div className="sec-title" style={{ marginBottom:10, fontSize:12 }}>Publishing Rules</div>
              {['Every post needs a CTA','Space posts 3h+ apart per platform','Batch-schedule on Mondays','Review analytics at 48h'].map(r => (
                <div key={r} style={{ display:'flex', gap:7, padding:'5px 0', borderBottom:'1px solid var(--border)', fontSize:11.5, color:'var(--text2)', lineHeight:1.4 }}>
                  <span style={{ color:'var(--accent2)', flexShrink:0 }}>→</span>{r}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Workflows Tab ── */}
      {tab === 'workflows' && (
        <div>
          <div className="sec-hdr">
            <div className="sec-title">Auto-Distribution Workflows</div>
            <span style={{ fontSize:11, color:'var(--text3)' }}>Post once → publish everywhere</span>
          </div>
          <div style={{ background:'var(--accent3)', border:'1px solid rgba(108,71,255,.2)', borderRadius:'var(--r-sm)', padding:'12px 16px', marginBottom:18, display:'flex', gap:10, alignItems:'center' }}>
            <span style={{ fontSize:18 }}>⚡</span>
            <div>
              <div style={{ fontSize:12.5, fontWeight:700, color:'var(--accent2)', marginBottom:2 }}>How Workflows Work</div>
              <div style={{ fontSize:11.5, color:'var(--text2)' }}>Post to your source platform — CCC OS auto-distributes to all destinations. No watermarks. No manual uploads.</div>
            </div>
          </div>
          {workflows.map(w => {
            const srcDef = PLATFORM_DEFS.find(p => p.id === w.source_platform);
            return (
              <div key={w.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 14px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-sm)', marginBottom:8 }}>
                <span style={{ fontSize:15 }}>{srcDef?.icon || '•'}</span>
                <span style={{ fontSize:12.5, fontWeight:600, color:'var(--text)', minWidth:100 }}>{srcDef?.name || w.source_platform}</span>
                <span style={{ color:'var(--accent2)', fontSize:14 }}>→</span>
                <div style={{ display:'flex', gap:5, flex:1, flexWrap:'wrap' }}>
                  {w.destinations.map(d => <DestBadge key={d} id={d} />)}
                </div>
                <span style={{ fontSize:10.5, color: w.active?'var(--green)':'var(--text3)', fontWeight:600 }}>{w.active?'Active':'Paused'}</span>
                <button onClick={() => handleToggleWorkflow(w.id, w.active)}
                  style={{ width:36, height:20, borderRadius:10, background: w.active?'var(--green)':'var(--surface2)', border:'none', cursor:'pointer', position:'relative', transition:'background .15s', flexShrink:0 }}>
                  <span style={{ position:'absolute', top:2, left: w.active?18:2, width:16, height:16, borderRadius:'50%', background:'#fff', transition:'left .15s', display:'block' }} />
                </button>
                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => handleDeleteWorkflow(w.id)}><I n="trash" s={11} /></button>
              </div>
            );
          })}
          {workflows.length === 0 && <div className="panel empty">No workflows yet. Connect platforms first, then workflows will appear here.</div>}
        </div>
      )}

      {/* ── Connect Tab ── */}
      {tab === 'connect' && (
        <div>
          <div className="sec-hdr">
            <div className="sec-title">Connect Your Platforms</div>
            <span style={{ fontSize:11, color:'var(--text3)' }}>🔒 OAuth only — passwords never shared</span>
          </div>
          <div style={{ background:'var(--green-d)', border:'1px solid rgba(34,197,94,.2)', borderRadius:'var(--r-sm)', padding:'11px 15px', marginBottom:18, fontSize:11.5, color:'var(--text2)' }}>
            🔒 Platforms connect via secure OAuth 2.0. We store only an access token — never your password. Disconnect any time.
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
            {PLATFORM_DEFS.map(p => {
              const conn = connections.find(c => c.platform === p.id && c.connected);
              const isConnecting = connecting === p.id;
              return (
                <div key={p.id} style={{ background: conn?'var(--green-d)':p.comingSoon?'var(--surface)':'var(--surface)', border:`2px solid ${conn?'rgba(34,197,94,.35)':'var(--border)'}`, borderRadius:'var(--r)', padding:'18px 14px', textAlign:'center', opacity: p.comingSoon?.5:1 }}>
                  <div style={{ fontSize:28, marginBottom:8 }}>{p.icon}</div>
                  <div style={{ fontFamily:'var(--font-d)', fontSize:12.5, fontWeight:700, color:'var(--text)', marginBottom:4 }}>{p.name}</div>
                  {conn && <div style={{ fontSize:10.5, color:'var(--green)', marginBottom:8 }}>● {conn.handle || 'Connected'}</div>}
                  {!conn && !p.comingSoon && <div style={{ fontSize:10.5, color:'var(--text3)', marginBottom:8 }}>Not connected</div>}
                  {p.comingSoon && <div style={{ fontSize:10.5, color:'var(--text3)', marginBottom:8 }}>Coming Soon</div>}
                  {!p.comingSoon && (
                    conn
                      ? <button className="btn btn-danger btn-sm" style={{ width:'100%', justifyContent:'center' }} onClick={() => handleDisconnect(p.id)}>Disconnect</button>
                      : <button className="btn btn-primary btn-sm" style={{ width:'100%', justifyContent:'center', background: isConnecting?'var(--surface2)':'var(--accent)' }} onClick={() => handleConnect(p.id)} disabled={isConnecting}>
                          {isConnecting ? 'Connecting...' : 'Connect →'}
                        </button>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ marginTop:20, padding:'14px 18px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r)', fontSize:12, color:'var(--text3)', lineHeight:1.6 }}>
            <strong style={{ color:'var(--text2)' }}>Phase 1 supports:</strong> YouTube, Instagram, Facebook, LinkedIn. TikTok and Pinterest are in Phase 2. To enable OAuth, add your platform app credentials to the <code style={{ background:'var(--surface2)', padding:'1px 5px', borderRadius:4, fontSize:11 }}>.env</code> file before deploying.
          </div>
        </div>
      )}

      {/* ── Add Post Modal ── */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Schedule New Post</div>
            <div className="form-row">
              <label className="form-label">Content Title</label>
              <input className="form-input" placeholder="Working title" value={form.title} onChange={e => setForm({...form,title:e.target.value})} autoFocus />
            </div>
            <div className="form-row">
              <label className="form-label">Caption / Script</label>
              <textarea className="form-textarea" rows={3} placeholder="Caption, hashtags, CTA..." value={form.caption} onChange={e => setForm({...form,caption:e.target.value})} />
            </div>
            <div className="form-row-2">
              <div>
                <label className="form-label">Date</label>
                <input className="form-input" type="date" value={form.scheduledDate} onChange={e => setForm({...form,scheduledDate:e.target.value})} />
              </div>
              <div>
                <label className="form-label">Time</label>
                <input className="form-input" type="time" value={form.scheduledTime} onChange={e => setForm({...form,scheduledTime:e.target.value})} />
              </div>
            </div>
            <div className="form-row">
              <label className="form-label">Format</label>
              <select className="form-select" value={form.format} onChange={e => setForm({...form,format:e.target.value})}>
                {['Short Form Video','Carousel','Long Form Video','Story','Thread','Email'].map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div className="form-row">
              <label className="form-label">Publish To</label>
              {PLATFORM_DEFS.filter(p=>!p.comingSoon).map(p => {
                const sel = form.dests.includes(p.id);
                const conn = connections.find(c=>c.platform===p.id&&c.connected);
                return (
                  <div key={p.id} onClick={() => toggleDest(p.id)} style={{ display:'flex', alignItems:'center', gap:9, padding:'9px 12px', background: sel?'var(--accent3)':'var(--surface)', border:`1px solid ${sel?'var(--accent)':'var(--border)'}`, borderRadius:'var(--r-sm)', marginBottom:6, cursor:'pointer', transition:'all .12s' }}>
                    <div style={{ width:16, height:16, borderRadius:4, border:`1px solid ${sel?'var(--accent)':'var(--border2)'}`, background:sel?'var(--accent)':'transparent', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:'#fff', flexShrink:0 }}>{sel?'✓':''}</div>
                    <span style={{ fontSize:15 }}>{p.icon}</span>
                    <span style={{ fontSize:12.5, fontWeight:600, color:'var(--text)', flex:1 }}>{p.name}</span>
                    {!conn && <span style={{ fontSize:10, color:'var(--amber)' }}>Not connected</span>}
                    {conn && <span style={{ fontSize:10, color:'var(--green)' }}>● Ready</span>}
                  </div>
                );
              })}
            </div>
            <div style={{ background:'var(--accent3)', border:'1px solid rgba(108,71,255,.2)', borderRadius:'var(--r-sm)', padding:'10px 13px', marginBottom:14, fontSize:11.5, color:'var(--text2)' }}>
              💡 CCC OS will cross-post to all selected platforms at the scheduled time automatically.
            </div>
            <div className="modal-acts">
              <button className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddPost}>
                <I n="calendar" s={13} /> Add to Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [brands, setBrands] = useState([]);
  const [activeBrand, setActiveBrand] = useState(null);
  const [page, setPage] = useState('dashboard');
  const [quickAdd, setQuickAdd] = useState(false);
  const [pillars, setPillars] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [payHistory, setPayHistory] = useState([]);
  const [upgradePrompt, setUpgradePrompt] = useState(null); // { reason, message }

  // Check auth on mount
  useEffect(() => {
    const token = localStorage.getItem('ccc_token');
    if (!token) { setAuthChecked(true); return; }
    api.auth.me().then(({ user }) => {
      setUser(user);
      setAuthChecked(true);
    }).catch(() => {
      localStorage.removeItem('ccc_token');
      setAuthChecked(true);
    });
  }, []);

  // ─── HANDLE PAYMENT RETURN URLS ─────────────────────────────────────────────
  // Stripe redirects to /?billing=success&session_id=cs_xxx
  // PayPal redirects to /?billing=paypal-success&subscription_id=P-xxx
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const billingStatus = params.get('billing');
    const paypalSubId = params.get('subscription_id');

    if (billingStatus === 'success') {
      // Stripe success — clean URL and show success screen
      window.history.replaceState({}, '', '/');
      setPage('billing-success');
      // Refresh subscription state
      setTimeout(() => {
        api.billing.subscription().then(setSubscription).catch(() => {});
      }, 1500);
    } else if (billingStatus === 'paypal-success' && paypalSubId) {
      // PayPal success — activate the subscription then show success
      window.history.replaceState({}, '', '/');
      api.billing.paypalActivate(paypalSubId)
        .then(() => {
          setPage('billing-success');
          return api.billing.subscription();
        })
        .then(setSubscription)
        .catch(err => {
          console.error('PayPal activation error:', err);
          setPage('billing');
        });
    } else if (billingStatus === 'canceled') {
      // Customer clicked cancel/back on Stripe or PayPal — just go back to billing
      window.history.replaceState({}, '', '/');
      setPage('billing');
    }
  }, []);

  // Load brands after auth
  useEffect(() => {
    if (!user) return;
    api.brands.list().then(b => {
      setBrands(b);
      if (b.length > 0 && !activeBrand) setActiveBrand(b[0]);
    });
    // Load subscription
    api.billing.subscription().then(setSubscription).catch(() => {});
    api.billing.history().then(setPayHistory).catch(() => {});
  }, [user?.id]);

  // Load pillars when brand changes
  useEffect(() => {
    if (!activeBrand) return;
    api.brands.pillars.list(activeBrand.id).then(setPillars);
  }, [activeBrand?.id]);

  const logout = () => {
    localStorage.removeItem('ccc_token');
    setUser(null);
    setBrands([]);
    setActiveBrand(null);
    setSubscription(null);
  };

  // ─── BILLING HANDLERS ──────────────────────────────────────────────────────
  const handleSubscribe = async (tier, interval, provider) => {
    try {
      if (provider === 'paypal') {
        const { approvalUrl } = await api.billing.paypalCheckout(tier, interval);
        window.location.href = approvalUrl;
      } else {
        const { url } = await api.billing.stripeCheckout(tier, interval);
        window.location.href = url;
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleManageStripe = async () => {
    try {
      const { url } = await api.billing.stripePortal();
      window.location.href = url;
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      await api.billing.cancel();
      const updated = await api.billing.subscription();
      setSubscription(updated);
    } catch (err) {
      alert(err.message);
    }
  };

  const refreshBrands = () => {
    api.brands.list().then(b => { setBrands(b); });
  };

  if (!authChecked) return (
    <>
      <style>{STYLES}</style>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'var(--bg)', color:'var(--text3)', gap:12, fontFamily:'var(--font-b)' }}>
        <I n="refresh" s={18} c="spin" /> Loading...
      </div>
    </>
  );

  if (!user) return (
    <>
      <style>{STYLES}</style>
      <AuthScreen onAuth={setUser} />
    </>
  );

  const NAV = [
    { id:'dashboard', label:'Command Center', icon:'dashboard' },
    { id:'strategy', label:'Strategy Room', icon:'strategy' },
    { id:'production', label:'Production Room', icon:'production' },
    { id:'distribution', label:'Distribution Room', icon:'distribution' },
    { id:'scheduler', label:'Scheduler', icon:'calendar' },
    { id:'data', label:'Data Room', icon:'data' },
    { id:'monetization', label:'Monetization', icon:'money' },
    { id:'billing', label:'Plans & Billing', icon:'shield' },
  ];

  const PAGE_TITLES = {
    dashboard: 'Command Center',
    strategy: 'Strategy Room',
    production: 'Production Room',
    distribution: 'Distribution Room',
    scheduler: 'Scheduler & Distributor',
    data: 'Data Room',
    monetization: 'Monetization Room',
    billing: 'Plans & Billing',
  };

  const renderPage = () => {
    const props = { activeBrand, setPage };
    switch(page) {
      case 'dashboard': return <CommandCenter {...props} />;
      case 'strategy': return <StrategyRoom {...props} />;
      case 'production': return <ProductionRoom {...props} />;
      case 'distribution': return <DistributionRoom {...props} />;
      case 'data': return <DataRoom {...props} />;
      case 'monetization': return <MonetizationRoom {...props} />;
      case 'scheduler': return <SchedulerRoom {...props} />;
      case 'billing-success':
        return (
          <SuccessScreen
            tier={subscription?.tier}
            onContinue={() => setPage('dashboard')}
          />
        );
      case 'billing':
        if (subscription?.is_admin) {
          return (
            <div className="page">
              <div className="panel" style={{ maxWidth:480, margin:'40px auto', textAlign:'center', padding:36 }}>
                <div style={{ fontSize:32, marginBottom:12 }}>🛡️</div>
                <div style={{ fontFamily:'var(--font-d)', fontSize:18, fontWeight:800, color:'var(--text)', marginBottom:8 }}>Admin Account</div>
                <div style={{ fontSize:13, color:'var(--text2)', lineHeight:1.65 }}>
                  You have full <span style={{ color:'var(--green)', fontWeight:600 }}>Operator-level access</span> to everything in CCC OS. No billing required. Use this time to test every module before you launch.
                </div>
                <div style={{ marginTop:20, padding:'12px 16px', background:'var(--green-d)', border:'1px solid rgba(34,197,94,.2)', borderRadius:'var(--r-sm)', fontSize:12, color:'var(--green)' }}>
                  ✓ All modules unlocked &nbsp;·&nbsp; ✓ Unlimited brands &nbsp;·&nbsp; ✓ No video quota
                </div>
              </div>
            </div>
          );
        }
        if (subscription?.active) {
          return (
            <BillingManagement
              subscription={subscription}
              history={payHistory}
              onManageStripe={handleManageStripe}
              onCancel={handleCancelSubscription}
              onUpgrade={() => setPage('pricing')}
            />
          );
        }
        return (
          <PricingPage
            currentTier={subscription?.tier}
            onSubscribe={handleSubscribe}
          />
        );
      case 'pricing':
        return (
          <PricingPage
            currentTier={subscription?.tier}
            onSubscribe={handleSubscribe}
          />
        );
      default: return <div className="page"><div className="empty">Coming soon.</div></div>;
    }
  };

  return (
    <>
      <style>{STYLES}</style>
      <div className="app">
        {/* Sidebar */}
        <div className="sidebar">
          <div className="s-logo">
            <div className="s-logo-eyebrow">Levi Acay</div>
            <div className="s-logo-title">Content<br /><span className="s-logo-accent">Command Center</span></div>
          </div>

          {activeBrand && (
            <BrandSelector brands={brands} activeBrand={activeBrand} onSelect={setActiveBrand} />
          )}

          <nav className="s-nav">
            <div className="s-section">Modules</div>
            {NAV.map(item => (
              <div key={item.id} className={`s-item ${page===item.id?'active':''}`} onClick={() => setPage(item.id)}>
                <I n={item.icon} s={14} />
                {item.label}
              </div>
            ))}
          </nav>

          <div className="s-footer">
            {/* Subscription status + usage */}
            {subscription?.active && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:10.5, color:'var(--text3)', marginBottom:4 }}>
                  <span>Videos This Month</span>
                  <span style={{ color: (subscription.usage?.videos_percent||0) >= 80 ? 'var(--amber)' : 'var(--text3)' }}>
                    {subscription.usage?.videos_used||0}/{subscription.usage?.videos_limit||0}
                  </span>
                </div>
                <div style={{ height:3, background:'var(--surface2)', borderRadius:2, overflow:'hidden' }}>
                  <div style={{
                    height:'100%', borderRadius:2,
                    width:`${Math.min(subscription.usage?.videos_percent||0,100)}%`,
                    background: (subscription.usage?.videos_percent||0) >= 90 ? 'var(--red)' : (subscription.usage?.videos_percent||0) >= 70 ? 'var(--amber)' : 'var(--accent)',
                    transition:'width .4s'
                  }} />
                </div>
                {(subscription.usage?.videos_percent||0) >= 80 && (
                  <button style={{ fontSize:10.5, color:'var(--accent2)', background:'none', border:'none', cursor:'pointer', padding:'3px 0', fontFamily:'var(--font-b)' }}
                    onClick={() => setPage('pricing')}>
                    Upgrade for more →
                  </button>
                )}
              </div>
            )}
            {!subscription?.active && !subscription?.is_admin && (
              <button className="btn btn-ghost" style={{ width:'100%', justifyContent:'center', fontSize:11.5, marginBottom:4, borderColor:'rgba(108,71,255,.35)', color:'var(--accent2)' }}
                onClick={() => setPage('billing')}>
                ⚡ Activate Plan
              </button>
            )}
            <button className="btn btn-primary" style={{ width:'100%', justifyContent:'center' }} onClick={() => setQuickAdd(true)}>
              <I n="zap" s={13} /> Quick Add
            </button>
            <button className="btn btn-ghost" style={{ width:'100%', justifyContent:'center', fontSize:12 }} onClick={logout}>
              <I n="logout" s={13} /> Sign Out
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="main">
          <div className="topbar">
            <div className="topbar-title">
              {PAGE_TITLES[page]}
              {activeBrand && <span className="topbar-sub">— {activeBrand.name}</span>}
            </div>
            <div className="topbar-acts">
              <button className="btn btn-ghost" style={{ fontSize:12 }} onClick={() => setPage('data')}>
                <I n="review" s={13} /> Weekly Review
              </button>
              <button className="btn btn-primary" onClick={() => setQuickAdd(true)}>
                <I n="plus" s={13} /> New Content
              </button>
            </div>
          </div>
          {renderPage()}
        </div>

        {/* Quick Add */}
        {quickAdd && activeBrand && (
          <QuickAddModal
            activeBrand={activeBrand}
            pillars={pillars}
            onClose={() => setQuickAdd(false)}
            onSave={() => {}}
          />
        )}

        {/* Upgrade Prompt — shown when limit is hit */}
        {upgradePrompt && (
          <UpgradePrompt
            reason={upgradePrompt.reason}
            currentTier={subscription?.tier || 'starter'}
            onUpgrade={() => { setUpgradePrompt(null); setPage('pricing'); }}
            onClose={() => setUpgradePrompt(null)}
          />
        )}
      </div>
    </>
  );
}
