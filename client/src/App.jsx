// client/src/App.jsx
import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';
import * as api from './lib/api.js';
import { PricingPage, BillingManagement, UpgradePrompt, SuccessScreen } from './pages/Billing.jsx';
import { useContentStore } from './lib/store/useContentStore.ts';
import { MODULES } from './modules.js';
import { Button, Card, StatCard, SectionLabel, PillNav } from './components/ui';
import { useIsMobile, cols } from './lib/useIsMobile.js';

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
    studio: "M15 10l4.553-2.069A1 1 0 0 1 21 8.87V15.13a1 1 0 0 1-1.447.9L15 14 M3 8h12a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z",
    shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
    review: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8",
    settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
    bell: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0",
    user: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
    upload: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12",
    globe: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M2 12h20 M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z",
    creditCard: "M1 4h22v16H1z M1 10h22",
    download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5 5 5 5 M12 3v12",
    image: "M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z M8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z M21 15l-5-5L5 21",
    scissors: "M6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M6 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6z M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12",
    advisor: "M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z",
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
// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300;1,400&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #0C0A07; --bg2: #141108; --bg3: #1A1610;
    --surface: #1A1610; --surface2: #231E16;
    --border: rgba(212,149,58,0.08); --border2: rgba(212,149,58,0.18);
    --text: #F0EBE0; --text2: #A89880; --text3: #6B5E4E;
    --accent: #D4953A; --accent2: #F0A800; --accent3: rgba(212,149,58,0.1);
    --green: #3D9E8C; --green-d: rgba(61,158,140,0.12);
    --red: #C42A18; --red-d: rgba(196,42,24,0.1);
    --amber: #F0A800; --amber-d: rgba(240,168,0,0.1);
    --cyan: #6ECFBF; --cyan-d: rgba(110,207,191,0.12);
    --font-d: 'Sora', sans-serif; --font-b: 'Sora', sans-serif;
    --r: 10px; --r-sm: 7px;
  }
  html, body, #root { height: 100%; background: var(--bg); color: var(--text); font-family: var(--font-b); font-size: 14px; }
  ::-webkit-scrollbar { width: 3px; height: 3px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #3D3428; border-radius: 2px; }

  /* ── Layout ── */
  .app { display: flex; height: 100vh; overflow: hidden; }
  .sidebar { width: 220px; flex-shrink: 0; background: var(--bg2); border-right: 1px solid rgba(212,149,58,0.1); display: flex; flex-direction: column; overflow: hidden; }
  .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
  .page { flex: 1; overflow-y: auto; padding: 24px 28px; }

  /* ── Sidebar ── */
  .s-logo { padding: 18px 18px 14px; border-bottom: 1px solid rgba(212,149,58,0.08); }
  .s-logo-eyebrow { font-size: 10px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--text3); margin-bottom: 3px; }
  .s-logo-title { font-family: var(--font-d); font-size: 13px; font-weight: 800; color: var(--text); line-height: 1.3; letter-spacing: -0.01em; }
  .s-logo-accent { color: var(--accent2); }
  .s-nav { flex: 1; padding: 6px 0; overflow-y: auto; }
  .s-section { font-size: 9px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: var(--text3); padding: 14px 16px 4px; opacity: 0.7; }
  .s-item { display: flex; align-items: center; gap: 9px; padding: 8px 10px 8px 16px; cursor: pointer; color: var(--text3); font-size: 12.5px; font-weight: 500; border-left: 2px solid transparent; transition: color .13s, background .13s; }
  .s-item:hover { color: var(--text2); background: rgba(212,149,58,0.05); }
  .s-item.active { color: var(--text); background: rgba(212,149,58,0.08); border-left-color: var(--accent2); }
  .s-item.active svg { color: var(--accent2); }
  .s-footer { padding: 12px; border-top: 1px solid rgba(212,149,58,0.08); display: flex; flex-direction: column; gap: 7px; }

  /* ── Brand Selector ── */
  .brand-sel { margin: 10px 12px; background: var(--surface); border: 1px solid var(--border2); border-radius: var(--r-sm); padding: 8px 10px; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: border-color .15s; position: relative; }
  .brand-sel:hover { border-color: var(--accent2); }
  .b-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
  .brand-sel-name { font-size: 12.5px; font-weight: 600; color: var(--text); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .brand-dd { position: absolute; top: calc(100% + 5px); left: 0; right: 0; background: var(--bg2); border: 1px solid var(--border2); border-radius: var(--r); z-index: 200; box-shadow: 0 16px 40px rgba(0,0,0,.7); animation: fadeDown .14s ease; }
  .brand-opt { display: flex; align-items: center; gap: 8px; padding: 10px 12px; cursor: pointer; transition: background .1s; }
  .brand-opt:hover { background: var(--surface); }
  .brand-opt.sel { background: var(--accent3); }

  /* ── Topbar ── */
  .topbar { height: 52px; flex-shrink: 0; background: var(--bg2); border-bottom: 1px solid rgba(212,149,58,0.08); display: flex; align-items: center; padding: 0 24px; gap: 14px; }
  .topbar-title { font-family: var(--font-d); font-size: 14px; font-weight: 700; color: var(--text); flex: 1; letter-spacing: -0.01em; }
  .topbar-sub { color: var(--text3); font-size: 12px; font-weight: 400; margin-left: 8px; }
  .topbar-acts { display: flex; align-items: center; gap: 7px; }

  /* ── Buttons ── */
  .btn { padding: 7px 14px; border-radius: var(--r-sm); font-family: var(--font-b); font-size: 12.5px; font-weight: 600; cursor: pointer; border: none; transition: all .13s; display: inline-flex; align-items: center; gap: 6px; }
  .btn-ghost { background: none; border: 1px solid var(--border2); color: var(--text2); }
  .btn-ghost:hover { border-color: var(--accent); color: var(--text); background: rgba(212,149,58,0.05); }
  .btn-primary { background: linear-gradient(135deg, #D4953A, #F0A800); color: #0C0A07; font-weight: 700; box-shadow: 0 0 16px rgba(212,149,58,0.25); }
  .btn-primary:hover { box-shadow: 0 0 24px rgba(240,168,0,0.35); filter: brightness(1.05); }
  .btn-sm { padding: 5px 10px; font-size: 11.5px; }
  .btn-icon { width: 30px; height: 30px; padding: 0; justify-content: center; }
  .btn-danger { background: var(--red-d); color: var(--red); border: 1px solid rgba(196,42,24,.25); }
  .btn-danger:hover { background: var(--red); color: white; }

  /* ── KPI Grid ── */
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 22px; }
  .kpi-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); padding: 18px; position: relative; overflow: hidden; transition: border-color .15s; border-top: 2px solid var(--accent2); }
  .kpi-card:hover { border-color: var(--border2); }
  .kpi-glow { position: absolute; top: -10px; right: -10px; width: 70px; height: 70px; border-radius: 50%; opacity: .1; filter: blur(24px); pointer-events: none; }
  .kpi-label { font-size: 10px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--text3); margin-bottom: 6px; }
  .kpi-val { font-family: var(--font-d); font-size: 28px; font-weight: 800; color: var(--text); line-height: 1; margin-bottom: 5px; letter-spacing: -0.02em; }
  .kpi-delta { font-size: 11px; font-weight: 600; }
  .kpi-icon { position: absolute; top: 16px; right: 16px; opacity: .15; }

  /* ── Panels ── */
  .panel { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); padding: 18px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 22px; }
  .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 22px; }
  .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 18px; }

  /* ── Section Headers ── */
  .sec-hdr { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
  .sec-title { font-family: var(--font-d); font-size: 12.5px; font-weight: 700; color: var(--text); display: flex; align-items: center; gap: 7px; letter-spacing: -0.01em; }
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
  .tag { display: inline-flex; align-items: center; padding: 2px 7px; background: rgba(212,149,58,0.07); border: 1px solid rgba(212,149,58,0.12); border-radius: 20px; font-size: 10.5px; color: var(--text3); font-weight: 500; }

  /* ── Pipeline Board ── */
  .pipeline { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; margin-bottom: 22px; }
  .pipe-col { background: var(--surface); border-radius: var(--r); overflow: hidden; }
  .pipe-col-hdr { padding: 10px 11px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
  .pipe-col-lbl { font-size: 9.5px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--text3); }
  .pipe-col-cnt { font-size: 10px; font-weight: 700; background: var(--surface2); color: var(--text3); border-radius: 20px; padding: 1px 6px; }
  .pipe-cards { padding: 7px; display: flex; flex-direction: column; gap: 5px; min-height: 60px; }
  .pipe-card { background: var(--bg3); border: 1px solid var(--border); border-radius: var(--r-sm); padding: 8px 9px; cursor: pointer; transition: border-color .13s, transform .1s; }
  .pipe-card:hover { border-color: var(--accent2); transform: translateY(-1px); }
  .pipe-card-title { font-size: 11px; font-weight: 500; color: var(--text); line-height: 1.4; margin-bottom: 5px; }
  .pipe-card-meta { display: flex; flex-wrap: wrap; gap: 3px; }

  /* ── Tables ── */
  .data-table { width: 100%; border-collapse: collapse; }
  .data-table th { font-size: 9px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--text3); padding: 0 12px 10px; text-align: left; white-space: nowrap; }
  .data-table td { font-size: 12.5px; color: var(--text2); padding: 9px 12px; border-top: 1px solid var(--border); }
  .data-table tr:hover td { background: rgba(212,149,58,0.03); }
  .data-table td:first-child { color: var(--text); font-weight: 500; }

  /* ── Forms / Modals ── */
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.8); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px; }
  .modal { background: var(--bg2); border: 1px solid var(--border2); border-radius: 14px; padding: 24px; width: 100%; max-width: 500px; max-height: 92vh; overflow-y: auto; animation: fadeUp .18s ease; }
  .modal-lg { max-width: 700px; }
  .modal-title { font-family: var(--font-d); font-size: 16px; font-weight: 800; color: var(--text); margin-bottom: 18px; letter-spacing: -0.02em; }
  .form-row { margin-bottom: 13px; }
  .form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 11px; margin-bottom: 13px; }
  .form-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .1em; color: var(--text3); display: block; margin-bottom: 5px; }
  .form-input, .form-select, .form-textarea { width: 100%; background: var(--bg3); border: 1px solid var(--border2); border-radius: var(--r-sm); padding: 9px 11px; font-family: var(--font-b); font-size: 13px; color: var(--text); outline: none; transition: border-color .13s; }
  .form-input:focus, .form-select:focus, .form-textarea:focus { border-color: var(--accent2); }
  .form-select { cursor: pointer; }
  .form-textarea { resize: vertical; min-height: 72px; line-height: 1.5; }
  .modal-acts { display: flex; gap: 8px; margin-top: 18px; justify-content: flex-end; }

  /* ── Tabs ── */
  .tabs { display: flex; gap: 2px; background: var(--surface); border-radius: var(--r-sm); padding: 3px; width: fit-content; margin-bottom: 18px; border: 1px solid var(--border); }
  .tab { padding: 5px 13px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; color: var(--text3); transition: all .13s; border: none; background: none; font-family: var(--font-b); }
  .tab.active { background: linear-gradient(135deg, #D4953A, #F0A800); color: #0C0A07; }

  /* ── Auth Screen ── */
  .auth-screen { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--bg); padding: 20px; }
  .auth-card { background: var(--bg2); border: 1px solid var(--border2); border-radius: 16px; padding: 36px; width: 100%; max-width: 420px; }
  .auth-logo { font-family: var(--font-d); font-size: 22px; font-weight: 800; color: var(--text); margin-bottom: 6px; letter-spacing: -0.02em; }
  .auth-logo span { color: var(--accent2); }
  .auth-sub { font-size: 13px; color: var(--text3); margin-bottom: 22px; }
  .auth-tabs { display: flex; gap: 0; margin-bottom: 22px; border-bottom: 1px solid var(--border); }
  .auth-tab { padding: 8px 18px; font-size: 13px; font-weight: 600; cursor: pointer; color: var(--text3); border: none; background: none; font-family: var(--font-b); border-bottom: 2px solid transparent; transition: all .13s; margin-bottom: -1px; }
  .auth-tab.active { color: var(--accent2); border-bottom-color: var(--accent2); }
  .auth-error { background: var(--red-d); border: 1px solid rgba(196,42,24,.25); border-radius: var(--r-sm); padding: 10px 14px; font-size: 13px; color: var(--red); margin-bottom: 14px; }
  .auth-google-btn { width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px; padding: 10px 16px; background: #fff; border: 1px solid #dadce0; border-radius: var(--r-sm); font-family: var(--font-b); font-size: 13.5px; font-weight: 600; color: #3c4043; cursor: pointer; transition: background .13s, box-shadow .13s; margin-bottom: 18px; }
  .auth-google-btn:hover { background: #f8f9fa; box-shadow: 0 1px 6px rgba(0,0,0,.2); }
  .auth-google-btn:disabled { opacity: .55; cursor: not-allowed; }
  .auth-divider { display: flex; align-items: center; gap: 10px; margin-bottom: 18px; color: var(--text3); font-size: 11px; font-weight: 600; letter-spacing: .05em; text-transform: uppercase; }
  .auth-divider::before, .auth-divider::after { content:''; flex: 1; height: 1px; background: var(--border); }

  /* ── Sidebar user avatar ── */
  .s-user { display: flex; align-items: center; gap: 9px; padding: 14px 16px 12px; border-bottom: 1px solid rgba(212,149,58,0.08); }
  .s-avatar { width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: var(--font-d); font-size: 11px; font-weight: 800; color: #0C0A07; flex-shrink: 0; text-transform: uppercase; background: linear-gradient(135deg,#D4953A,#F0A800); overflow: hidden; }
  .s-avatar img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
  .s-user-info { min-width: 0; }
  .s-user-name { font-size: 12px; font-weight: 700; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 148px; }
  .s-user-email { font-size: 10px; color: var(--text3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 148px; }

  /* ── Distribution Room ── */
  .funnel-card { background: var(--bg3); border: 1px solid var(--border); border-radius: var(--r); padding: 16px; margin-bottom: 10px; }
  .funnel-steps { display: grid; grid-template-columns: repeat(5, 1fr); gap: 7px; margin-top: 12px; }
  .funnel-step { background: var(--surface); border-radius: var(--r-sm); padding: 9px 10px; }
  .funnel-step-lbl { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .1em; color: var(--text3); margin-bottom: 4px; }
  .funnel-step-val { font-size: 12px; color: var(--text); font-weight: 500; line-height: 1.4; }

  .cta-route-row { display: flex; align-items: center; gap: 12px; padding: 11px 14px; background: var(--bg3); border: 1px solid var(--border); border-radius: var(--r-sm); margin-bottom: 7px; }
  .cta-stage-badge { width: 48px; text-align: center; }
  .cta-route-info { flex: 1; }
  .cta-route-label { font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 3px; }
  .cta-route-copy { font-size: 11.5px; color: var(--text3); font-style: italic; }
  .cta-route-dest { font-size: 12px; color: var(--cyan); max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .orphan-alert { background: rgba(240,168,0,.07); border: 1px solid rgba(240,168,0,.2); border-radius: var(--r); padding: 14px 18px; margin-bottom: 18px; display: flex; align-items: flex-start; gap: 12px; }
  .orphan-all-clear { background: var(--green-d); border: 1px solid rgba(61,158,140,.25); }

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
  .performer-row { display: flex; align-items: center; gap: 11px; padding: 8px 0; border-bottom: 1px solid var(--border); cursor: pointer; }
  .performer-row:last-child { border-bottom: none; }
  .performer-rank { font-family: var(--font-d); font-size: 15px; font-weight: 800; color: var(--text3); width: 22px; }
  .performer-info { flex: 1; min-width: 0; }
  .performer-title { font-size: 12px; font-weight: 500; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .performer-meta { font-size: 10.5px; color: var(--text3); margin-top: 1px; }
  .performer-score { font-family: var(--font-d); font-size: 17px; font-weight: 800; color: var(--accent2); }

  /* ── Revenue calc ── */
  .calc-result { background: linear-gradient(135deg, rgba(212,149,58,.12), rgba(212,149,58,.04)); border: 1px solid rgba(212,149,58,.25); border-radius: var(--r); padding: 20px; text-align: center; margin-bottom: 14px; }
  .calc-big { font-family: var(--font-d); font-size: 44px; font-weight: 800; color: var(--accent2); line-height: 1; letter-spacing: -0.03em; }
  .calc-lbl { font-size: 11.5px; color: var(--text3); margin-top: 4px; }

  /* ── Review steps ── */
  .review-step { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); padding: 18px; margin-bottom: 12px; }
  .review-step-hdr { display: flex; align-items: center; gap: 11px; margin-bottom: 12px; }
  .review-step-num { width: 26px; height: 26px; background: linear-gradient(135deg,#D4953A,#F0A800); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: var(--font-d); font-size: 12px; font-weight: 800; color: #0C0A07; flex-shrink: 0; }
  .review-step-title { font-size: 13.5px; font-weight: 700; color: var(--text); }
  .review-step-time { font-size: 10.5px; color: var(--text3); margin-left: auto; }
  .review-textarea { width: 100%; background: var(--bg3); border: 1px solid var(--border2); border-radius: var(--r-sm); padding: 10px 12px; font-family: var(--font-b); font-size: 12.5px; color: var(--text); outline: none; resize: vertical; min-height: 80px; line-height: 1.55; }
  .review-textarea:focus { border-color: var(--accent2); }
  .review-textarea::placeholder { color: var(--text3); }

  /* ── Hook cards ── */
  .hook-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .hook-card { background: var(--bg3); border: 1px solid var(--border); border-radius: var(--r-sm); padding: 12px; cursor: pointer; transition: border-color .13s; }
  .hook-card:hover { border-color: var(--accent2); }
  .hook-card.winner { border-color: rgba(61,158,140,.3); }
  .hook-text { font-size: 12.5px; font-weight: 500; color: var(--text); line-height: 1.5; margin-bottom: 9px; }
  .hook-meta { display: flex; align-items: center; justify-content: space-between; }
  .hook-score { font-family: var(--font-d); font-size: 19px; font-weight: 800; color: var(--accent2); }
  .hook-score.hi { color: var(--green); }

  /* ── Misc ── */
  .divider { height: 1px; background: var(--border); margin: 18px 0; }
  .empty { text-align: center; padding: 36px; color: var(--text3); font-size: 12.5px; }
  .loading { display: flex; align-items: center; justify-content: center; height: 120px; color: var(--text3); font-size: 13px; gap: 10px; }

  /* ── Campaign row ── */
  .campaign-row { display: flex; align-items: center; gap: 14px; padding: 12px 16px; background: var(--bg3); border: 1px solid var(--border); border-radius: var(--r-sm); margin-bottom: 7px; }
  .campaign-info { flex: 1; }
  .campaign-name { font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 3px; }
  .campaign-dates { font-size: 11px; color: var(--text3); }
  .cprog { width: 140px; }
  .cprog-lbl { display: flex; justify-content: space-between; font-size: 10.5px; color: var(--text3); margin-bottom: 4px; }
  .cbar { height: 4px; background: var(--surface2); border-radius: 3px; overflow: hidden; }
  .cbar-fill { height: 100%; border-radius: 3px; background: linear-gradient(90deg,#D4953A,#F0A800); }
  .camp-rev { font-family: var(--font-d); font-size: 16px; font-weight: 700; color: var(--green); text-align: right; }

  /* ── Offer row ── */
  .offer-row { display: flex; align-items: center; gap: 12px; padding: 11px 15px; background: var(--bg3); border: 1px solid var(--border); border-radius: var(--r-sm); margin-bottom: 7px; }
  .offer-name { flex: 1; font-size: 13px; font-weight: 600; color: var(--text); }
  .offer-price { font-family: var(--font-d); font-size: 17px; font-weight: 800; color: var(--green); }
  .status-dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; flex-shrink: 0; }
  .s-active { background: var(--green); box-shadow: 0 0 5px rgba(61,158,140,.6); }
  .s-inactive { background: var(--text3); }

  /* ── Pillar item ── */
  .pillar-item { display: flex; align-items: center; gap: 11px; padding: 10px 13px; background: var(--bg3); border: 1px solid var(--border); border-radius: var(--r-sm); margin-bottom: 6px; cursor: pointer; transition: border-color .13s; }
  .pillar-item:hover { border-color: var(--accent2); }
  .pillar-bar { width: 3px; height: 30px; border-radius: 2px; flex-shrink: 0; }
  .pillar-name { font-size: 13px; font-weight: 600; color: var(--text); flex: 1; }

  /* ── Animations ── */
  @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes spin { to { transform: rotate(360deg); } }
  .spin { animation: spin 1s linear infinite; }

  /* ── Settings Page ── */
  .settings-layout { display: grid; grid-template-columns: 196px 1fr; gap: 22px; align-items: start; }
  .settings-nav { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); overflow: hidden; position: sticky; top: 0; }
  .settings-nav-item { display: flex; align-items: center; gap: 9px; padding: 10px 14px; cursor: pointer; font-size: 13px; font-weight: 500; color: var(--text3); border-left: 2px solid transparent; transition: all .13s; }
  .settings-nav-item:hover { color: var(--text2); background: rgba(212,149,58,0.04); }
  .settings-nav-item.active { color: var(--text); background: var(--accent3); border-left-color: var(--accent2); }
  .settings-nav-item.active svg { color: var(--accent2); }
  .settings-nav-sep { height: 1px; background: var(--border); }
  .settings-nav-item.danger { color: var(--red); }
  .settings-nav-item.danger:hover { background: var(--red-d); }
  .settings-nav-item.danger.active { color: var(--red); background: var(--red-d); border-left-color: var(--red); }
  .settings-panel { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); padding: 24px; }
  .settings-hdr { margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid var(--border); }
  .settings-hdr-title { font-family: var(--font-d); font-size: 16px; font-weight: 800; color: var(--text); margin-bottom: 4px; letter-spacing: -0.02em; }
  .settings-hdr-sub { font-size: 12.5px; color: var(--text3); }
  .settings-section { margin-bottom: 22px; }
  .settings-section-label { font-size: 10px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--text3); margin-bottom: 12px; }

  /* Toggle switch */
  .toggle-row { display: flex; align-items: center; justify-content: space-between; padding: 11px 0; border-bottom: 1px solid var(--border); }
  .toggle-row:last-child { border-bottom: none; }
  .toggle-info { flex: 1; }
  .toggle-label { font-size: 13px; font-weight: 500; color: var(--text); margin-bottom: 2px; }
  .toggle-desc { font-size: 11.5px; color: var(--text3); }
  .toggle { width: 38px; height: 21px; background: var(--surface2); border-radius: 20px; cursor: pointer; position: relative; transition: background .18s; flex-shrink: 0; border: none; outline: none; }
  .toggle.on { background: linear-gradient(135deg,#D4953A,#F0A800); }
  .toggle::after { content:''; position: absolute; top: 3px; left: 3px; width: 15px; height: 15px; background: white; border-radius: 50%; transition: transform .18s; }
  .toggle.on::after { transform: translateX(17px); }

  /* Avatar upload */
  .avatar-upload { width: 80px; height: 80px; border-radius: 50%; background: var(--surface2); border: 2px dashed var(--border2); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: border-color .15s; flex-shrink: 0; }
  .avatar-upload:hover { border-color: var(--accent2); }
  .avatar-upload-row { display: flex; align-items: center; gap: 18px; margin-bottom: 20px; }
  .avatar-upload-hint { font-size: 11.5px; color: var(--text3); line-height: 1.6; }

  /* Platform connect cards */
  .platform-connect-card { display: flex; align-items: center; gap: 14px; padding: 14px 16px; background: var(--bg3); border: 1px solid var(--border); border-radius: var(--r-sm); margin-bottom: 9px; transition: border-color .13s; }
  .platform-connect-card:hover { border-color: var(--border2); }
  .platform-connect-card.connected { border-color: rgba(61,158,140,.2); background: rgba(61,158,140,.03); }
  .platform-icon { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 18px; }
  .platform-connect-info { flex: 1; }
  .platform-connect-name { font-size: 13.5px; font-weight: 700; color: var(--text); margin-bottom: 2px; }
  .platform-connect-status { font-size: 11.5px; color: var(--text3); }
  .platform-connect-status.live { color: var(--green); }

  /* Billing placeholder */
  .billing-placeholder { background: var(--bg3); border: 1px solid var(--border); border-radius: var(--r); padding: 28px; text-align: center; }
  .billing-placeholder-icon { font-size: 36px; margin-bottom: 12px; }
  .billing-placeholder-title { font-family: var(--font-d); font-size: 15px; font-weight: 700; color: var(--text); margin-bottom: 6px; }
  .billing-placeholder-sub { font-size: 12.5px; color: var(--text3); line-height: 1.65; margin-bottom: 18px; }

  /* Danger zone */
  .danger-zone { border: 1px solid rgba(196,42,24,.2); border-radius: var(--r); padding: 20px; background: rgba(196,42,24,.04); }
  .danger-zone-title { font-size: 13.5px; font-weight: 700; color: var(--red); margin-bottom: 5px; }
  .danger-zone-desc { font-size: 12.5px; color: var(--text3); line-height: 1.6; margin-bottom: 16px; }
  .danger-confirm-row { display: flex; align-items: center; gap: 12px; }
  
  /* ── Input placeholders ── */
  input::placeholder, textarea::placeholder { color: var(--text3); }
  select option { background: var(--bg2); color: var(--text); }

  /* ── Command Center Dashboard (scoped) ── */
  .cc-dashboard {
    --cc-bg: #F7F8FA; --cc-surface: #FFFFFF; --cc-border: #EEF0F3;
    --cc-text: #16151A; --cc-text2: #6B7280; --cc-text3: #9CA3AF;
    --cc-radius: 16px; --cc-radius-sm: 10px;
    --cc-shadow: 0 1px 3px rgba(16,24,40,0.06), 0 1px 2px rgba(16,24,40,0.04);
    background: var(--cc-bg); padding: 32px; min-height: 100%; flex: 1; overflow-y: auto;
  }

  .cc-dashboard .kpi-card { background: var(--cc-surface); border-radius: var(--cc-radius); box-shadow: var(--cc-shadow); border: 1px solid var(--cc-border); padding: 20px; }
  .cc-dashboard .kpi-icon, .cc-dashboard .kpi-glow { display: none; }
  .cc-dashboard .kpi-val { font-family: 'Sora', sans-serif; font-weight: 700; font-size: 30px; color: var(--cc-text); }
  .cc-dashboard .kpi-label { font-family: 'DM Mono', monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--cc-text2); }
  .cc-dashboard .kpi-delta { display: inline-flex; align-items: center; gap: 3px; background: rgba(61,158,140,0.12); color: var(--green); padding: 2px 8px; border-radius: 999px; font-family: 'DM Mono', monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; width: fit-content; }

  .cc-dashboard .sec-title { font-family: 'Sora', sans-serif; font-weight: 600; font-size: 16px; color: var(--cc-text); }
  .cc-dashboard .sec-title svg { display: none; }
  .cc-dashboard .sec-title::before { content: ''; display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--accent); }
  .cc-dashboard .sec-title.cc-dot-accent::before { background: var(--accent); }
  .cc-dashboard .sec-title.cc-dot-green::before { background: var(--green); }
  .cc-dashboard .sec-title.cc-dot-accent2::before { background: var(--accent2); }

  .cc-dashboard .pipe-col { background: var(--cc-surface); border: 1px solid var(--cc-border); border-radius: var(--cc-radius-sm); }
  .cc-dashboard .pipe-col-lbl { font-family: 'Sora', sans-serif; font-weight: 600; font-size: 13px; color: var(--cc-text); text-transform: none; letter-spacing: normal; }
  .cc-dashboard .pipe-col-cnt { background: var(--cc-bg); color: var(--cc-text2); font-family: 'DM Mono', monospace; font-size: 11px; }
  .cc-dashboard .pipe-card { background: var(--cc-surface); border: 1px solid var(--cc-border); border-radius: var(--cc-radius-sm); box-shadow: none; transition: box-shadow .15s, border-color .15s; }
  .cc-dashboard .pipe-card:hover { box-shadow: var(--cc-shadow); transform: none; }
  .cc-dashboard .pipe-card-title { color: var(--cc-text); }

  .cc-dashboard .panel { background: var(--cc-surface); border: 1px solid var(--cc-border); border-radius: var(--cc-radius); box-shadow: var(--cc-shadow); }
  .cc-dashboard .platform-row, .cc-dashboard .performer-row { border-bottom: 1px solid var(--cc-border); transition: background .12s; }
  .cc-dashboard .platform-row:hover, .cc-dashboard .performer-row:hover { background: var(--cc-bg); }
  .cc-dashboard .platform-name, .cc-dashboard .performer-title { color: var(--cc-text); }
  .cc-dashboard .pgrowth, .cc-dashboard .performer-score { font-family: 'DM Mono', monospace; }
  .cc-dashboard .pbar { background: var(--cc-border); }

  .cc-dashboard .campaign-row { background: var(--cc-surface); border: 1px solid var(--cc-border); border-radius: var(--cc-radius-sm); box-shadow: var(--cc-shadow); }
  .cc-dashboard .campaign-name { color: var(--cc-text); }
  .cc-dashboard .camp-rev { font-family: 'DM Mono', monospace; }
  .cc-dashboard .cc-stat-card { background: var(--cc-surface); border: 1px solid var(--cc-border); border-radius: var(--cc-radius-sm); padding: 12px 14px; text-align: center; }
  .cc-dashboard .cc-deal-row { background: var(--cc-surface); border: 1px solid var(--cc-border); border-radius: var(--cc-radius-sm); padding: 11px 14px; }
  .cc-dashboard .empty { color: var(--cc-text3); }

  /* ── Floating shell (redesigned app frame) ── */
  .shell { display: flex; gap: 14px; height: 100vh; padding: 14px; overflow: hidden; background: radial-gradient(1200px 600px at 78% -10%, rgba(212,149,58,0.07), transparent 60%), var(--bg); }
  .main-float { flex: 1; display: flex; flex-direction: column; min-width: 0; overflow: hidden; }
  .content-scroll { flex: 1; overflow-y: auto; border-radius: 24px; }

  /* Reusable glass surface for downstream screens/components */
  .glass { background: linear-gradient(180deg, rgba(36,30,22,0.55), rgba(26,22,16,0.45)); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(212,149,58,0.12); border-radius: 22px; box-shadow: 0 10px 40px rgba(0,0,0,0.35); }

  /* Pill button helper (rounded-full) */
  .btn-pill { border-radius: 999px !important; padding: 9px 18px; }

  /* ── Floating rail: logo + user chip ── */
  .rail-logo { display: flex; align-items: center; gap: 10px; padding: 6px 8px 4px; }
  .rail-logo-mark { width: 34px; height: 34px; border-radius: 12px; background: linear-gradient(135deg,#D4953A,#F0A800); color: #0C0A07; font-family: var(--font-d); font-weight: 800; font-size: 16px; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 18px rgba(212,149,58,0.3); flex-shrink: 0; }
  .rail-logo-title { font-family: var(--font-d); font-size: 12.5px; font-weight: 800; line-height: 1.25; letter-spacing: -0.01em; color: var(--text); }
  .rail-user { display: flex; align-items: center; gap: 9px; padding: 10px 6px 4px; margin-top: 10px; border-top: 1px solid var(--border); }

  /* ── Floating topbar (pill) ── */
  .topbar-float { display: flex; align-items: center; gap: 14px; background: linear-gradient(180deg, rgba(36,30,22,0.6), rgba(26,22,16,0.5)); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid var(--border2); border-radius: 999px; padding: 9px 12px 9px 24px; margin-bottom: 14px; flex-shrink: 0; box-shadow: 0 12px 40px rgba(0,0,0,0.4); }

  /* ── Dashboard hero + bento ── */
  .dash { padding: 8px 24px 34px; }
  .hero { display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 36px; align-items: center; margin: 12px 0 40px; }
  .hero-title { font-family: var(--font-d); font-size: 46px; font-weight: 800; line-height: 1.04; letter-spacing: -0.035em; color: var(--text); margin: 16px 0 14px; }
  .hero-sub { font-size: 14.5px; color: var(--text2); line-height: 1.65; max-width: 460px; margin-bottom: 24px; }
  .hero-actions { display: flex; gap: 12px; flex-wrap: wrap; }
  .hero-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .hero-stats > :nth-child(even) { transform: translateY(26px); }

  .bento { display: grid; grid-template-columns: repeat(12, 1fr); gap: 14px; align-items: start; }
  .b-4 { grid-column: span 4; }
  .b-5 { grid-column: span 5; }
  .b-7 { grid-column: span 7; }
  .b-8 { grid-column: span 8; }
  .b-12 { grid-column: span 12; }

  .dash-sec-hdr { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
  .dash-h { font-family: var(--font-d); font-size: 18px; font-weight: 700; letter-spacing: -0.02em; color: var(--text); margin-top: 9px; }

  /* Dark base for brand-deal cards (previously only styled under .cc-dashboard) */
  .cc-stat-card { background: rgba(36,30,22,0.5); border: 1px solid var(--border2); border-radius: 14px; padding: 12px 14px; text-align: center; }
  .cc-deal-row { background: rgba(36,30,22,0.5); border: 1px solid var(--border2); border-radius: 14px; padding: 11px 14px; }

  @media (max-width: 1200px) {
    .hero { grid-template-columns: 1fr; }
    .hero-title { font-size: 38px; }
    .bento > * { grid-column: span 12 !important; }
  }

  /* Phones: the nav rail becomes an off-canvas drawer (see PillNav), so the
     shell no longer reserves a column for it. Reclaim the space for content,
     and clear the fixed hamburger in the topbar. */
  @media (max-width: 768px) {
    .shell { padding: 10px; gap: 0; }
    .topbar-float { padding: 9px 12px 9px 66px; }
    .topbar-title { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
    .topbar-acts { flex-shrink: 0; }
    .content-scroll { border-radius: 18px; }
    /* Kanban pipeline: 6 fixed columns are unreadable on a phone. Switch to a
       horizontal swipe — each column ~78% wide so the next one peeks. */
    .pipeline { grid-template-columns: none; grid-auto-flow: column; grid-auto-columns: 78%; overflow-x: auto; scroll-snap-type: x proximity; -webkit-overflow-scrolling: touch; }
    .pipe-col { scroll-snap-align: start; }
  }
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
// Google logo SVG (official brand mark)
const GoogleLogo = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
    <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
  </svg>
);

function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Listen for Google OAuth postMessage from the popup window
  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type !== 'ccc_oauth_result') return;
      if (e.data.platform !== 'google_auth') return;
      setGoogleLoading(false);
      if (e.data.status === 'success' && e.data.token) {
        localStorage.setItem('ccc_token', e.data.token);
        onAuth(e.data.user || { name: 'User', email: '' });
      } else {
        setError(e.data.reason ? decodeURIComponent(e.data.reason) : 'Google sign-in failed. Try again.');
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onAuth]);

  const handleGoogleLogin = () => {
    setGoogleLoading(true);
    setError('');
    const popup = window.open('/api/auth/google', 'ccc-google-auth', 'width=500,height=640,scrollbars=yes,resizable=yes');
    // Detect if popup was closed without completing OAuth
    const checkClosed = setInterval(() => {
      if (popup?.closed) { clearInterval(checkClosed); setGoogleLoading(false); }
    }, 800);
  };

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

        {/* ── Google Sign-In ── */}
        <button className="auth-google-btn" onClick={handleGoogleLogin} disabled={googleLoading || loading}>
          {googleLoading
            ? <><span className="spin" style={{ width:16, height:16, borderRadius:'50%', border:'2px solid #dadce0', borderTopColor:'#4285F4', display:'inline-block' }} /> Signing in…</>
            : <><GoogleLogo /> Continue with Google</>
          }
        </button>

        <div className="auth-divider">or</div>

        {error && <div className="auth-error">{error}</div>}

        {/* ── Email / Password form ── */}
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
          <button className="btn btn-primary" type="submit" style={{ width:'100%', justifyContent:'center', marginTop: 6 }} disabled={loading || googleLoading}>
            {loading ? '…' : mode === 'login' ? 'Sign In' : 'Create Account & Start'}
          </button>
        </form>

        {/* ── Mode switch link ── */}
        <div style={{ marginTop: 18, textAlign: 'center', fontSize: 12.5, color: 'var(--text3)' }}>
          {mode === 'login'
            ? <>Don't have an account? <button onClick={() => { setMode('register'); setError(''); }} style={{ background:'none', border:'none', color:'var(--accent2)', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-b)', fontSize:12.5, padding:0 }}>Sign up free</button></>
            : <>Already have an account? <button onClick={() => { setMode('login'); setError(''); }} style={{ background:'none', border:'none', color:'var(--accent2)', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-b)', fontSize:12.5, padding:0 }}>Sign in</button></>
          }
        </div>
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
    <div style={{ position:'relative', margin:'10px 2px 4px' }} ref={ref}>
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
function PipelineBoard({ onCardClick }) {
  // Read from global content store; shows mock data on first load.
  // Nothing currently calls setItems() to sync real data in — Production Room,
  // the only caller, was removed.
  const { items, moveContentStatus } = useContentStore();
  const COLS = ['Idea','Scripted','Filming','Scheduled','Published','Repurposed'];

  const handleDrop = (e, col) => {
    const id = e.dataTransfer.getData('text/plain');
    if (id) moveContentStatus(id, col);
  };

  return (
    <div className="pipeline">
      {COLS.map(col => {
        const cards = items.filter(a => a.status === col);
        return (
          <div
            className="pipe-col"
            key={col}
            onDragOver={e => e.preventDefault()}
            onDrop={e => handleDrop(e, col)}
          >
            <div className="pipe-col-hdr">
              <span className="pipe-col-lbl">{col}</span>
              <span className="pipe-col-cnt">{cards.length}</span>
            </div>
            <div className="pipe-cards">
              {cards.slice(0,5).map(c => (
                <div
                  className="pipe-card"
                  key={c.id}
                  draggable
                  onDragStart={e => e.dataTransfer.setData('text/plain', c.id)}
                  onClick={() => onCardClick && onCardClick(c)}
                >
                  <div className="pipe-card-title">{c.title}</div>
                  <div className="pipe-card-meta">
                    <span className="badge badge-format">{c.format}</span>
                    <span className="badge badge-plat">{c.platform}</span>
                    {c.funnel_stage && <span className={`badge badge-${c.funnel_stage.toLowerCase()}`}>{c.funnel_stage}</span>}
                  </div>
                </div>
              ))}
              {cards.length===0 && (
                <div style={{ color:'var(--text3)', fontSize:10.5, textAlign:'center', padding:'14px 0', opacity:.6 }}>
                  Drop here
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── COMMAND CENTER ───────────────────────────────────────────────────────────
function CommandCenter({ activeBrand, setPage, user, onQuickAdd }) {
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
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = (user?.name || 'Operator').split(' ')[0];
  const brandName = activeBrand?.name || 'your brand';
  const kpis = [
    { label:'Total Views', value: fmt(tot.total_views||0), delta:'+23% this week' },
    { label:'New Followers', value: fmt(tot.total_followers||0), delta:'+8.4% growth' },
    { label:'Leads Generated', value: fmt(tot.total_leads||0), delta:'30 days' },
    { label:'Est. Revenue', value: money(tot.total_revenue||0), delta:'This month' },
  ];

  return (
    <div className="dash">
      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-left">
          <SectionLabel>Mission Control</SectionLabel>
          <h1 className="hero-title">{greeting}, {firstName}.<br />Let's grow {brandName}.</h1>
          <p className="hero-sub">Your entire content engine in one view — pipeline, platforms, deals, and revenue. Pick the next move and ship it.</p>
          <div className="hero-actions">
            <Button variant="primary" size="lg" onClick={onQuickAdd}><I n="plus" s={15} /> New Content</Button>
            <Button variant="secondary" size="lg" onClick={() => setPage('scheduler')}><I n="calendar" s={15} /> Open Scheduler</Button>
          </div>
        </div>
        <div className="hero-stats">
          {kpis.map(k => <StatCard key={k.label} value={k.value} label={k.label} delta={k.delta} />)}
        </div>
      </section>

      {/* ── Bento ── */}
      <div className="bento">
        {/* Production Pipeline (large) */}
        <Card className="b-8">
          <div className="dash-sec-hdr">
            <div>
              <SectionLabel>Pipeline</SectionLabel>
              <h3 className="dash-h">Production Pipeline</h3>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setPage('studio')}>Content Studio</Button>
          </div>
          <PipelineBoard />
        </Card>

        {/* Top Performers (small) */}
        <Card className="b-4">
          <div className="dash-sec-hdr">
            <div>
              <SectionLabel>Ranking</SectionLabel>
              <h3 className="dash-h">Top Performers</h3>
            </div>
            <span style={{ fontSize:10.5, color:'var(--text3)', marginTop:9 }}>By score</span>
          </div>
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
        </Card>

        {/* Platform Tracker (medium) */}
        <Card className="b-5">
          <div className="dash-sec-hdr">
            <div>
              <SectionLabel>Distribution</SectionLabel>
              <h3 className="dash-h">Platform Tracker</h3>
            </div>
          </div>
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
        </Card>

        {/* Brand Deals (large) */}
        <Card className="b-7">
          <BrandDealsSection activeBrand={activeBrand} />
        </Card>
      </div>

      {/* Active Campaigns */}
      {campaigns.length > 0 && (
        <Card style={{ marginTop:14 }}>
          <div className="dash-sec-hdr">
            <div>
              <SectionLabel>Campaigns</SectionLabel>
              <h3 className="dash-h">Active Campaigns</h3>
            </div>
          </div>
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
        </Card>
      )}
    </div>
  );
}
function BrandDealsSection({ activeBrand }) {
  const isMobile = useIsMobile();
  const [deals, setDeals] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ partner_name:'', deal_type:'Paid', amount:0, status:'Inbound', deliverables:'', deadline:'', notes:'' });

  const load = () => {
    if (!activeBrand) return;
    import('./lib/api').then(({ deals: dealsApi }) => dealsApi.list(activeBrand.id).then(setDeals).catch(() => {}));
  };

  useEffect(() => { load(); }, [activeBrand?.id]);

  const STATUSES = ['Inbound','Negotiating','Active','Completed','Rejected'];
  const STATUS_C = { Inbound:'var(--text3)', Negotiating:'var(--amber)', Active:'var(--green)', Completed:'var(--accent2)', Rejected:'var(--red)' };
  const DEAL_TYPES = ['Paid','Gifted','Affiliate'];

  const totalRevenue = deals.filter(d=>['Active','Completed'].includes(d.status)).reduce((s,d)=>s+(d.amount||0),0);
  const pipeline = STATUSES.slice(0,4).map(s => ({ status:s, count:deals.filter(d=>d.status===s).length, color:STATUS_C[s] }));

  const handleSave = async () => {
    if (!form.partner_name.trim()) return;
    await import('./lib/api').then(({ deals: dealsApi }) => dealsApi.create({ brand_id: activeBrand?.id, ...form }));
    setForm({ partner_name:'', deal_type:'Paid', amount:0, status:'Inbound', deliverables:'', deadline:'', notes:'' });
    setShowAdd(false);
    load();
  };

  const updateStatus = async (id, status) => {
    await import('./lib/api').then(({ deals: dealsApi }) => dealsApi.update(id, { status }));
    load();
  };

  const handleDelete = async (id) => {
    await import('./lib/api').then(({ deals: dealsApi }) => dealsApi.delete(id));
    load();
  };

  return (
    <div>
      <div className="dash-sec-hdr">
        <div>
          <SectionLabel>Partnerships</SectionLabel>
          <h3 className="dash-h">Brand Deals</h3>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowAdd(true)}><I n="plus" s={12} /> Add Deal</Button>
      </div>

      {/* Stats row */}
      <div style={{ display:'grid', gridTemplateColumns:cols(isMobile, 'repeat(4,1fr)', '1fr 1fr'), gap:8, marginBottom:16 }}>
        <div className="cc-stat-card">
          <div style={{ fontSize:10, color:'var(--text3)', fontWeight:700, textTransform:'uppercase', marginBottom:4 }}>Total Revenue</div>
          <div style={{ fontFamily:'var(--font-d)', fontSize:20, fontWeight:800, color:'var(--green)' }}>{money(totalRevenue)}</div>
        </div>
        {pipeline.map(p => (
          <div key={p.status} className="cc-stat-card">
            <div style={{ fontSize:10, color:'var(--text3)', fontWeight:700, textTransform:'uppercase', marginBottom:4 }}>{p.status}</div>
            <div style={{ fontFamily:'var(--font-d)', fontSize:20, fontWeight:800, color:p.color }}>{p.count}</div>
          </div>
        ))}
      </div>

      {/* Deal cards */}
      {deals.map(d => (
        <div key={d.id} className="cc-deal-row" style={{ display:'flex', gap:12, alignItems:'center', marginBottom:7 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontWeight:600, fontSize:13, color:'var(--text)', marginBottom:3 }}>{d.partner_name}</div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              <span className="tag">{d.deal_type}</span>
              {d.deliverables && <span className="tag" style={{ maxWidth:160, overflow:'hidden', textOverflow:'ellipsis' }}>{d.deliverables}</span>}
              {d.deadline && <span className="tag" style={{ color:'var(--amber)' }}>Due {d.deadline}</span>}
            </div>
          </div>
          <div style={{ fontFamily:'var(--font-d)', fontSize:16, fontWeight:800, color:'var(--green)', flexShrink:0 }}>{money(d.amount)}</div>
          <select value={d.status} onChange={e => updateStatus(d.id, e.target.value)} className="form-select" style={{ width:130, fontSize:12, padding:'4px 8px', color:STATUS_C[d.status]||'var(--text)', background:'var(--bg3)' }}>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => handleDelete(d.id)}><I n="trash" s={11} /></button>
        </div>
      ))}
      {deals.length === 0 && <div className="panel empty">No brand deals yet. Track inbound partnerships, gifted collab requests, and paid deals here.</div>}

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Add Brand Deal</div>
            <div className="form-row">
              <label className="form-label">Partner / Brand Name</label>
              <input className="form-input" placeholder="e.g. Notion, Skillshare, Manscaped..." value={form.partner_name} onChange={e => setForm({...form,partner_name:e.target.value})} autoFocus />
            </div>
            <div className="form-row-2">
              <div className="form-row" style={{ marginBottom:0 }}>
                <label className="form-label">Deal Type</label>
                <select className="form-select" value={form.deal_type} onChange={e => setForm({...form,deal_type:e.target.value})}>
                  {DEAL_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-row" style={{ marginBottom:0 }}>
                <label className="form-label">Amount ($)</label>
                <input className="form-input" type="number" value={form.amount} onChange={e => setForm({...form,amount:parseFloat(e.target.value)||0})} />
              </div>
            </div>
            <div className="form-row-2">
              <div className="form-row" style={{ marginBottom:0 }}>
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={e => setForm({...form,status:e.target.value})}>
                  {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-row" style={{ marginBottom:0 }}>
                <label className="form-label">Deadline</label>
                <input className="form-input" type="date" value={form.deadline} onChange={e => setForm({...form,deadline:e.target.value})} />
              </div>
            </div>
            <div className="form-row">
              <label className="form-label">Deliverables</label>
              <input className="form-input" placeholder="e.g. 2 IG Reels + 1 Story" value={form.deliverables} onChange={e => setForm({...form,deliverables:e.target.value})} />
            </div>
            <div className="form-row">
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" rows={2} value={form.notes} onChange={e => setForm({...form,notes:e.target.value})} />
            </div>
            <div className="modal-acts">
              <button className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>Add Deal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function ContentStudioRoom({ activeBrand }) {
  const [tab, setTab] = useState('brief');
  const [brief, setBrief] = useState({ title:'', platform:'TikTok', pillar:'', hook_angle:'' });
  const [script, setScript] = useState({ hook:'', context:'', value:'', cta:'' });
  const [batchTopic, setBatchTopic] = useState('');
  const [batchPlatform, setBatchPlatform] = useState('TikTok');

  const HOOK_TYPES = ['Contrarian','Curiosity Gap','Story','Bold Claim','Social Proof','Question','How-To'];
  const PLATFORMS = ['TikTok','Instagram','YouTube','LinkedIn','Twitter'];

  const scriptTemplate = `HOOK:\n${script.hook || '[Your scroll-stopping opening line]'}\n\nCONTEXT:\n${script.context || '[Why this matters / who it\'s for]'}\n\nVALUE:\n${script.value || '[The actual insight / teaching / story]'}\n\nCTA:\n${script.cta || '[Clear next step for viewer]'}`;

  const captionVariations = batchTopic ? [
    `POV: You discovered ${batchTopic} and nothing has been the same since. Here's what changed →`,
    `The uncomfortable truth about ${batchTopic} nobody talks about. Save this before it's gone.`,
    `I spent 6 months figuring out ${batchTopic} so you don't have to. Here's everything:`,
    `If you're struggling with ${batchTopic}, you're not alone. This framework changed everything for me.`,
    `Hot take: ${batchTopic} isn't about what you think it's about. Here's the real insight:`,
  ] : [];

  return (
    <div className="page">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
        <div className="tabs" style={{ marginBottom:0 }}>
          {[['brief','📋 Brief Builder'],['script','📝 Script Template'],['batch','🔁 Batch Captions']].map(([t,lbl]) => (
            <button key={t} className={`tab ${tab===t?'active':''}`} onClick={() => setTab(t)}>{lbl}</button>
          ))}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:10.5, color:'var(--text3)', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:4, padding:'3px 8px', fontWeight:600 }}>✨ AI-powered — Coming soon</span>
        </div>
      </div>

      {tab === 'brief' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
          <div className="panel">
            <div className="sec-title" style={{ marginBottom:18 }}>Content Brief Generator</div>
            <div className="form-row">
              <label className="form-label">Content Title / Topic</label>
              <input className="form-input" placeholder="e.g. How I batch 30 days of content in 6 hours" value={brief.title} onChange={e => setBrief({...brief,title:e.target.value})} />
            </div>
            <div className="form-row-2">
              <div className="form-row" style={{ marginBottom:0 }}>
                <label className="form-label">Platform</label>
                <select className="form-select" value={brief.platform} onChange={e => setBrief({...brief,platform:e.target.value})}>
                  {PLATFORMS.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="form-row" style={{ marginBottom:0 }}>
                <label className="form-label">Content Pillar</label>
                <input className="form-input" placeholder="e.g. Systems & Workflow" value={brief.pillar} onChange={e => setBrief({...brief,pillar:e.target.value})} />
              </div>
            </div>
            <div className="form-row">
              <label className="form-label">Hook Angle</label>
              <select className="form-select" value={brief.hook_angle} onChange={e => setBrief({...brief,hook_angle:e.target.value})}>
                <option value="">Select hook type...</option>
                {HOOK_TYPES.map(h => <option key={h}>{h}</option>)}
              </select>
            </div>
          </div>

          <div>
            {brief.title ? (
              <div className="panel">
                <div className="sec-title" style={{ marginBottom:14 }}>Generated Brief</div>
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {[
                    ['Platform',brief.platform],
                    ['Content Pillar',brief.pillar||'—'],
                    ['Hook Type',brief.hook_angle||'—'],
                    ['Suggested Hook',brief.hook_angle === 'Contrarian' ? `"Stop ${brief.title.toLowerCase().replace('how','doing')} — do this instead"` :
                      brief.hook_angle === 'Curiosity Gap' ? `"The one thing about ${brief.title.split(' ').slice(-3).join(' ')} nobody shows you"` :
                      brief.hook_angle === 'Story' ? `"I almost quit ${brief.title.split(' ').slice(-2).join(' ')} until this happened"` :
                      `"${brief.title}"` ],
                    ['Caption Structure','Hook → Context → Value → CTA'],
                    ['Ideal Length',brief.platform==='TikTok'?'15–60 sec':brief.platform==='Instagram'?'15–30 sec':brief.platform==='YouTube'?'60–90 sec':'150–300 words'],
                    ['CTA Recommendation',brief.platform==='LinkedIn'?'Comment below':'Save this · Follow for more'],
                  ].map(([k,v]) => (
                    <div key={k} style={{ display:'flex', flexDirection:'column', gap:3, padding:'10px 12px', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'var(--r-sm)' }}>
                      <div style={{ fontSize:10, color:'var(--text3)', fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em' }}>{k}</div>
                      <div style={{ fontSize:12.5, color:'var(--text)', lineHeight:1.5 }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="panel" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:280, flexDirection:'column', gap:10 }}>
                <div style={{ fontSize:32 }}>🎬</div>
                <div style={{ fontSize:13, color:'var(--text3)', textAlign:'center' }}>Fill in a topic and platform<br />to generate your content brief</div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'script' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
          <div className="panel">
            <div className="sec-title" style={{ marginBottom:4 }}>Script Template</div>
            <div style={{ fontSize:11.5, color:'var(--text3)', marginBottom:18 }}>Hook → Context → Value → CTA</div>
            {[
              ['🎣 HOOK','The first 1–3 seconds. Pattern interrupt.','hook','e.g. "I quit making content for 30 days. Here\'s what happened."'],
              ['🌍 CONTEXT','Why this matters and who it\'s for.','context','e.g. "Most creators grind daily and burn out. I found a different way."'],
              ['💡 VALUE','The actual insight, teaching, or story.','value','e.g. "Batch everything. Film once, schedule for 30 days, then live your life."'],
              ['📣 CTA','The single clear next step.','cta','e.g. "Follow for the full batch system → Link in bio"'],
            ].map(([lbl, hint, field, placeholder]) => (
              <div className="form-row" key={field}>
                <label className="form-label">{lbl} <span style={{ color:'var(--text3)', fontWeight:400, marginLeft:4 }}>{hint}</span></label>
                <textarea className="form-textarea" rows={field==='value'?4:2} placeholder={placeholder} value={script[field]} onChange={e => setScript({...script,[field]:e.target.value})} />
              </div>
            ))}
          </div>
          <div className="panel" style={{ position:'relative' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <div className="sec-title">Script Preview</div>
              <button className="btn btn-ghost btn-sm" onClick={() => { navigator.clipboard?.writeText(scriptTemplate); }}>Copy</button>
            </div>
            <pre style={{ fontFamily:'var(--font-b)', fontSize:12.5, color:'var(--text)', lineHeight:1.75, whiteSpace:'pre-wrap', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'var(--r-sm)', padding:'16px', minHeight:300 }}>
              {scriptTemplate}
            </pre>
          </div>
        </div>
      )}

      {tab === 'batch' && (
        <div>
          <div className="panel" style={{ maxWidth:520, marginBottom:20 }}>
            <div className="sec-title" style={{ marginBottom:14 }}>Batch Caption Writer</div>
            <div className="form-row">
              <label className="form-label">Content Topic</label>
              <input className="form-input" placeholder="e.g. content batching, creator systems, productivity" value={batchTopic} onChange={e => setBatchTopic(e.target.value)} />
            </div>
            <div className="form-row">
              <label className="form-label">Platform</label>
              <select className="form-select" value={batchPlatform} onChange={e => setBatchPlatform(e.target.value)}>
                {PLATFORMS.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div style={{ padding:'10px 14px', background:'var(--accent3)', border:'1px solid rgba(108,71,255,.2)', borderRadius:'var(--r-sm)', fontSize:11.5, color:'var(--text2)', marginTop:8 }}>
              ✨ <strong>AI-powered batch generation</strong> coming soon. Below are template variations based on your topic.
            </div>
          </div>

          {captionVariations.length > 0 && (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--text2)', marginBottom:4 }}>5 Caption Variations for "{batchTopic}"</div>
              {captionVariations.map((c, i) => (
                <div key={i} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-sm)', padding:'14px 16px', display:'flex', gap:12, alignItems:'flex-start' }}>
                  <div style={{ fontFamily:'var(--font-d)', fontSize:18, fontWeight:800, color:'var(--accent2)', flexShrink:0, lineHeight:1 }}>#{i+1}</div>
                  <div style={{ flex:1, fontSize:13, color:'var(--text)', lineHeight:1.65 }}>{c}</div>
                  <button className="btn btn-ghost btn-sm" style={{ flexShrink:0 }} onClick={() => navigator.clipboard?.writeText(c)}>Copy</button>
                </div>
              ))}
            </div>
          )}
          {!captionVariations.length && (
            <div className="panel empty">Enter a topic above to generate 5 caption variations.</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── SCHEDULER ROOM ───────────────────────────────────────────────────────────
const PLATFORM_DEFS = [
  { id:'youtube',   name:'YouTube',       icon:'▶',  color:'#ff0000', comingSoon:false },
  { id:'instagram', name:'Instagram',     icon:'📷', color:'#e1306c', comingSoon:false },
  { id:'facebook',  name:'Facebook',      icon:'ⓕ', color:'#1877f2', comingSoon:false },
  { id:'tiktok',    name:'TikTok',        icon:'♪',  color:'#69c9d0', comingSoon:false },
  { id:'twitter',   name:'X / Twitter',  icon:'𝕏',  color:'#1d9bf0', comingSoon:false },
  { id:'threads',   name:'Threads',       icon:'@',  color:'#aaaaaa', comingSoon:false },
  { id:'linkedin',  name:'LinkedIn',      icon:'in', color:'#0a66c2', comingSoon:true  },
  { id:'pinterest', name:'Pinterest',     icon:'P',  color:'#e60023', comingSoon:false },
];

const DEST_META = {
  youtube:   { label:'YT',  color:'#ff0000', bg:'rgba(255,0,0,.12)' },
  instagram: { label:'IG',  color:'#e1306c', bg:'rgba(225,48,108,.12)' },
  tiktok:    { label:'TT',  color:'#69c9d0', bg:'rgba(105,201,208,.12)' },
  twitter:   { label:'X',   color:'#1d9bf0', bg:'rgba(29,155,240,.12)' },
  threads:   { label:'TH',  color:'#aaaaaa', bg:'rgba(170,170,170,.1)' },
  facebook:  { label:'FB',  color:'#1877f2', bg:'rgba(24,119,242,.12)' },
  linkedin:  { label:'LI',  color:'#0a66c2', bg:'rgba(10,102,194,.12)' },
  pinterest: { label:'PIN', color:'#e60023', bg:'rgba(230,0,35,.12)' },
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
  const isMobile = useIsMobile();
  const [tab, setTab] = useState('queue');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({ title:'', caption:'', format:'Short Form Video', scheduledDate:'', scheduledTime:'09:00', dests:[], mediaUrl:'' });

  const showToast = (msg, type='green') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    if (activeBrand) {
      try {
        const p = await api.scheduler.posts.list(activeBrand.id);
        // Normalize any legacy engine status to a planner status — this is a
        // manual planner, so a post is only ever 'scheduled' or 'done'.
        setPosts(p.map(x => ({ ...x, status: x.status === 'done' ? 'done' : 'scheduled' })));
      } catch(e) { console.error('[Scheduler] posts/list failed:', e); }
    }
    setLoading(false);
  }, [activeBrand?.id]);

  useEffect(() => { load(); }, [load]);

  const handleAddPost = async () => {
    if (!form.title.trim()) return showToast('Add a title', 'amber');
    if (!form.dests.length) return showToast('Select at least one platform', 'amber');
    if (!form.scheduledDate) return showToast('Set a date', 'amber');
    const needsMedia = form.dests.some(d => d === 'youtube' || d === 'instagram');
    if (needsMedia && !form.mediaUrl.trim()) return showToast('YouTube & Instagram require a media URL', 'amber');
    const scheduledAt = `${form.scheduledDate}T${form.scheduledTime}:00`;
    try {
      await api.scheduler.posts.create({
        brand_id: activeBrand?.id,
        title: form.title,
        caption: form.caption,
        format: form.format,
        destinations: form.dests,
        scheduled_at: scheduledAt,
        media_urls: form.mediaUrl.trim() ? [form.mediaUrl.trim()] : [],
      });
      setForm({ title:'', caption:'', format:'Short Form Video', scheduledDate:'', scheduledTime:'09:00', dests:[], mediaUrl:'' });
      setShowAdd(false);
      load();
      showToast('✓ Post scheduled', 'green');
    } catch(e) { showToast('Failed to schedule post', 'red'); }
  };

  const handleMarkDone = async (id) => {
    await api.scheduler.posts.update(id, { status: 'done' });
    load();
  };

  const handleReopen = async (id) => {
    await api.scheduler.posts.update(id, { status: 'scheduled' });
    load();
  };

  const handleDeletePost = async (id) => {
    await api.scheduler.posts.delete(id);
    load();
  };

  const toggleDest = (id) => {
    setForm(f => ({
      ...f,
      dests: f.dests.includes(id) ? f.dests.filter(d=>d!==id) : [...f.dests, id]
    }));
  };

  if (loading) return <div className="page"><div className="loading"><I n="refresh" s={16} c="spin" /> Loading scheduler...</div></div>;

  const scheduledCount = posts.filter(p => p.status !== 'done').length;
  const doneCount = posts.filter(p => p.status === 'done').length;
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
          <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--text3)', marginBottom:4 }}>Content Planner</div>
          <div style={{ fontSize:11.5, color:'var(--text3)', fontWeight:500 }}>
            Plan and track your posts. CCC OS does not post on your behalf.
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <I n="calendar" s={13} /> Schedule Post
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom:20, gridTemplateColumns: cols(isMobile, 'repeat(2,1fr)', '1fr 1fr') }}>
        {[
          ['Scheduled', scheduledCount, 'var(--accent2)', 'calendar'],
          ['Done', doneCount, 'var(--green)', 'check'],
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
      <div style={{ overflowX: isMobile ? 'auto' : 'visible', marginBottom:22 }}>
      <div style={{ display:'grid', gridTemplateColumns: cols(isMobile, 'repeat(7,1fr)', 'repeat(7, 64px)'), gap:6 }}>
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
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ width: isMobile ? '100%' : undefined, maxWidth:'100%', overflowX:'auto' }}>
        {[['queue','📋 Planner']].map(([t,lbl]) => (
          <button key={t} className={`tab ${tab===t?'active':''}`} style={{ flexShrink:0, whiteSpace:'nowrap' }} onClick={() => setTab(t)}>{lbl}</button>
        ))}
      </div>

      {/* ── Planner Tab ── */}
      {tab === 'queue' && (
        <div style={{ display:'grid', gridTemplateColumns: cols(isMobile, '1fr 280px'), gap:20, alignItems:'start' }}>
          <div>
            <div className="sec-hdr">
              <div className="sec-title">Your Content Plan</div>
              <span style={{ fontSize:11, color:'var(--text3)' }}>{posts.length} posts total</span>
            </div>
            {posts.length === 0 && (
              <div className="panel empty">
                No posts planned yet. Click "Schedule Post" to add your first one.
              </div>
            )}
            {posts.map(post => {
              const sTime = new Date(post.scheduled_at);
              const timeStr = sTime.toLocaleDateString('en-US',{month:'short',day:'numeric'}) + ' · ' + sTime.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
              const isDone = post.status === 'done';
              const isPastDue = !isDone && sTime < today;
              const chip = isDone
                ? { icon:'✓', color:'var(--green)', bg:'var(--green-d)', label:'Done', labelColor:'var(--green)' }
                : isPastDue
                  ? { icon:'!', color:'var(--amber)', bg:'var(--amber-d)', label:'Past due', labelColor:'var(--amber)' }
                  : { icon:'·', color:'var(--text3)', bg:'var(--surface2)', label:'Scheduled', labelColor:'var(--text3)' };
              return (
                <div key={post.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background:'var(--surface)', border:`1px solid ${isDone?'rgba(34,197,94,.2)':'var(--border)'}`, borderRadius:'var(--r-sm)', marginBottom:8, opacity:isDone?.7:1, transition:'border-color .15s' }}>
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
                    <div style={{ fontSize:11.5, color:'var(--text2)', fontWeight:500, marginBottom:2 }}>{timeStr}</div>
                    <div style={{ fontSize:10, color:chip.labelColor, fontWeight:600, marginBottom:4 }}>{chip.label}</div>
                    <div style={{ display:'flex', gap:5, justifyContent:'flex-end' }}>
                      {isDone ? (
                        <button className="btn btn-ghost btn-sm" style={{ fontSize:10.5, padding:'3px 9px' }} onClick={() => handleReopen(post.id)}>
                          Reopen
                        </button>
                      ) : (
                        <button className="btn btn-ghost btn-sm" style={{ fontSize:10.5, padding:'3px 9px' }} onClick={() => handleMarkDone(post.id)}>
                          Mark Done
                        </button>
                      )}
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={() => handleDeletePost(post.id)}><I n="trash" s={11} /></button>
                    </div>
                  </div>
                  <div style={{ width:22, height:22, borderRadius:'50%', background: chip.bg, color:chip.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0 }}>
                    {chip.icon}
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
              <div className="sec-title" style={{ marginBottom:10, fontSize:12 }}>Posting Tips</div>
              {['Every post needs a CTA','Space posts 3h+ apart per platform','Batch-schedule on Mondays','Review analytics at 48h'].map(r => (
                <div key={r} style={{ display:'flex', gap:7, padding:'5px 0', borderBottom:'1px solid var(--border)', fontSize:11.5, color:'var(--text2)', lineHeight:1.4 }}>
                  <span style={{ color:'var(--accent2)', flexShrink:0 }}>→</span>{r}
                </div>
              ))}
            </div>
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
              <label className="form-label">Platforms</label>
              {PLATFORM_DEFS.filter(p=>!p.comingSoon).map(p => {
                const sel = form.dests.includes(p.id);
                return (
                  <div key={p.id} onClick={() => toggleDest(p.id)} style={{ display:'flex', alignItems:'center', gap:9, padding:'9px 12px', background: sel?'var(--accent3)':'var(--surface)', border:`1px solid ${sel?'var(--accent)':'var(--border)'}`, borderRadius:'var(--r-sm)', marginBottom:6, cursor:'pointer', transition:'all .12s' }}>
                    <div style={{ width:16, height:16, borderRadius:4, border:`1px solid ${sel?'var(--accent)':'var(--border2)'}`, background:sel?'var(--accent)':'transparent', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:'#fff', flexShrink:0 }}>{sel?'✓':''}</div>
                    <span style={{ fontSize:15 }}>{p.icon}</span>
                    <span style={{ fontSize:12.5, fontWeight:600, color:'var(--text)', flex:1 }}>{p.name}</span>
                  </div>
                );
              })}
            </div>
            {/* Media URL — required when YouTube or Instagram is selected */}
            {form.dests.some(d => d === 'youtube' || d === 'instagram') && (
              <div className="form-row">
                <label className="form-label">
                  Media URL <span style={{ color:'var(--red)', fontWeight:700 }}>*</span>
                  <span style={{ color:'var(--text3)', fontWeight:400, marginLeft:6 }}>
                    {form.dests.includes('youtube') ? '(direct .mp4/.mov video link)' : '(direct image or .mp4 video link)'}
                  </span>
                </label>
                <input
                  className="form-input"
                  placeholder="https://cdn.example.com/your-video.mp4"
                  value={form.mediaUrl}
                  onChange={e => setForm({...form, mediaUrl: e.target.value})}
                />
                <div style={{ fontSize:11, color:'var(--text3)', marginTop:5, lineHeight:1.5 }}>
                  Optional reference link to the media you plan to post — kept with the plan so it's ready when you post it.
                </div>
              </div>
            )}

            <div style={{ background:'var(--accent3)', border:'1px solid rgba(108,71,255,.2)', borderRadius:'var(--r-sm)', padding:'10px 13px', marginBottom:14, fontSize:11.5, color:'var(--text2)' }}>
              💡 This adds the post to your planner. CCC OS does not auto-post — post it yourself on each platform, then mark it done.
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

// ─── SETTINGS ROOM ────────────────────────────────────────────────────────────
function SettingsRoom({ user }) {
  const [tab, setTab] = useState('profile');
  const [profile, setProfile] = useState({ name: user?.name || '', bio: '', timezone: 'America/Los_Angeles' });
  const [notifs, setNotifs] = useState({ email: true, push: false, weekly: true, mentions: true, newDeals: false });
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const TIMEZONES = [
    'America/Los_Angeles', 'America/Denver', 'America/Chicago', 'America/New_York',
    'America/Sao_Paulo', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
    'Asia/Dubai', 'Asia/Kolkata', 'Asia/Singapore', 'Asia/Tokyo',
    'Australia/Sydney', 'Pacific/Auckland',
  ];

  const PLATFORMS = [
    { id: 'youtube',   label: 'YouTube',    icon: '▶', color: '#FF0000', bg: 'rgba(255,0,0,0.12)',     desc: 'Upload & schedule long-form videos' },
    { id: 'instagram', label: 'Instagram',  icon: '📸', color: '#E1306C', bg: 'rgba(225,48,108,0.12)',  desc: 'Reels, Stories, feed posts' },
    { id: 'tiktok',    label: 'TikTok',     icon: '🎵', color: '#69C9D0', bg: 'rgba(105,201,208,0.12)', desc: 'Short-form video publishing' },
    { id: 'twitter',   label: 'Twitter / X', icon: '𝕏', color: '#aaaaaa', bg: 'rgba(170,170,170,0.10)', desc: 'Threads, posts, media' },
    { id: 'linkedin',  label: 'LinkedIn',   icon: 'in', color: '#0A66C2', bg: 'rgba(10,102,194,0.12)',  desc: 'Professional content' },
    { id: 'threads',   label: 'Threads',    icon: '@',  color: '#a855f7', bg: 'rgba(168,85,247,0.12)',  desc: 'Text & photo posts via Meta' },
  ];

  const TABS = [
    { id: 'profile',   label: 'Profile',             icon: 'user' },
    { id: 'notifs',    label: 'Notifications',        icon: 'bell' },
    { id: 'platforms', label: 'Connected Platforms',  icon: 'link' },
    { id: 'billing',   label: 'Billing',              icon: 'creditCard' },
    { id: 'danger',    label: 'Danger Zone',          icon: 'alert', danger: true },
  ];

  const Toggle = ({ on, onToggle }) => (
    <button className={`toggle ${on ? 'on' : ''}`} onClick={onToggle} aria-label="toggle" />
  );

  const renderTab = () => {
    switch (tab) {
      case 'profile': return (
        <>
          <div className="settings-hdr">
            <div className="settings-hdr-title">Profile</div>
            <div className="settings-hdr-sub">Your public creator identity across CCC OS.</div>
          </div>

          {/* Avatar */}
          <div className="avatar-upload-row">
            <div className="avatar-upload">
              <I n="upload" s={20} c="" />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 5 }}>Profile Photo</div>
              <div className="avatar-upload-hint">
                JPG or PNG, max 2 MB.<br />Recommended: 400×400 px.
              </div>
              <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }}>Upload photo</button>
            </div>
          </div>

          <div className="divider" />

          <div className="settings-section">
            <div className="settings-section-label">Basic Info</div>
            <div className="form-row-2">
              <div>
                <label className="form-label">Display Name</label>
                <input
                  className="form-input"
                  value={profile.name}
                  onChange={e => setProfile({ ...profile, name: e.target.value })}
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="form-label">Email</label>
                <input
                  className="form-input"
                  value={user?.email || ''}
                  disabled
                  style={{ opacity: 0.5, cursor: 'not-allowed' }}
                />
              </div>
            </div>
            <div className="form-row">
              <label className="form-label">Bio / Tagline</label>
              <textarea
                className="form-textarea"
                value={profile.bio}
                onChange={e => setProfile({ ...profile, bio: e.target.value })}
                placeholder="Content creator helping 100K+ people grow their brand..."
                rows={3}
              />
            </div>
          </div>

          <div className="settings-section">
            <div className="settings-section-label">Locale</div>
            <div className="form-row" style={{ maxWidth: 280 }}>
              <label className="form-label">Timezone</label>
              <select
                className="form-select"
                value={profile.timezone}
                onChange={e => setProfile({ ...profile, timezone: e.target.value })}
              >
                {TIMEZONES.map(tz => (
                  <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost">Cancel</button>
            <button className="btn btn-primary"><I n="check" s={13} /> Save changes</button>
          </div>
        </>
      );

      case 'notifs': return (
        <>
          <div className="settings-hdr">
            <div className="settings-hdr-title">Notifications</div>
            <div className="settings-hdr-sub">Choose when and how CCC OS reaches you.</div>
          </div>

          <div className="settings-section">
            <div className="settings-section-label">Email Alerts</div>
            <div className="panel" style={{ padding: '4px 16px', background: 'var(--bg3)' }}>
              {[
                { key: 'email',   label: 'Email notifications',    desc: 'System alerts and errors' },
                { key: 'weekly',  label: 'Weekly digest',          desc: 'Your top content performance every Monday' },
                { key: 'newDeals',label: 'New brand deal alerts',  desc: 'Get notified when a deal matches your niche' },
              ].map(({ key, label, desc }) => (
                <div key={key} className="toggle-row">
                  <div className="toggle-info">
                    <div className="toggle-label">{label}</div>
                    <div className="toggle-desc">{desc}</div>
                  </div>
                  <Toggle on={notifs[key]} onToggle={() => setNotifs({ ...notifs, [key]: !notifs[key] })} />
                </div>
              ))}
            </div>
          </div>

          <div className="settings-section">
            <div className="settings-section-label">In-App & Push</div>
            <div className="panel" style={{ padding: '4px 16px', background: 'var(--bg3)' }}>
              {[
                { key: 'push',      label: 'Browser push notifications', desc: 'Real-time alerts in your browser' },
                { key: 'mentions',  label: 'Comment & mention alerts',   desc: 'When your content gets traction' },
              ].map(({ key, label, desc }) => (
                <div key={key} className="toggle-row">
                  <div className="toggle-info">
                    <div className="toggle-label">{label}</div>
                    <div className="toggle-desc">{desc}</div>
                  </div>
                  <Toggle on={notifs[key]} onToggle={() => setNotifs({ ...notifs, [key]: !notifs[key] })} />
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary"><I n="check" s={13} /> Save preferences</button>
          </div>
        </>
      );

      case 'platforms': return (
        <>
          <div className="settings-hdr">
            <div className="settings-hdr-title">Platforms</div>
            <div className="settings-hdr-sub">The platforms you create content for. CCC OS is a planner — it does not connect to or post on your accounts.</div>
          </div>

          <div style={{ marginBottom: 18, padding: '10px 14px', background: 'var(--accent3)', border: '1px solid rgba(108,71,255,.2)', borderRadius: 'var(--r-sm)', fontSize: 12, color: 'var(--accent2)', display: 'flex', gap: 8, alignItems: 'center' }}>
            <I n="zap" s={13} />
            CCC OS does not auto-post. Use the <strong>Scheduler</strong> room to plan and track your posts, then post manually on each platform.
          </div>

          {PLATFORMS.map(p => (
            <div key={p.id} className="platform-connect-card">
              <div className="platform-icon" style={{ background: p.bg }}>
                <span style={{ fontSize: 16, lineHeight: 1, fontWeight: 700, color: p.color, fontFamily: 'monospace' }}>{p.icon}</span>
              </div>
              <div className="platform-connect-info">
                <div className="platform-connect-name">{p.label}</div>
                <div className="platform-connect-status">Not connected · {p.desc}</div>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                style={{ opacity: 0.6, cursor: 'not-allowed' }}
                title="Connect from the Scheduler room"
              >
                Connect
              </button>
            </div>
          ))}

          <div style={{ fontSize: 11.5, color: 'var(--text3)', marginTop: 10 }}>
            Plan and track posts per brand in the <button className="btn btn-ghost btn-sm" style={{ padding: '2px 8px', fontSize: 11 }}>Scheduler room ↗</button>
          </div>
        </>
      );

      case 'billing': return (
        <>
          <div className="settings-hdr">
            <div className="settings-hdr-title">Billing</div>
            <div className="settings-hdr-sub">Manage your subscription and payment methods.</div>
          </div>

          <div className="billing-placeholder">
            <div className="billing-placeholder-icon">💳</div>
            <div className="billing-placeholder-title">Billing managed in Plans & Billing</div>
            <div className="billing-placeholder-sub">
              Your subscription details, invoices, and upgrade options<br />
              are available in the dedicated billing module.
            </div>
            <button className="btn btn-primary">
              <I n="shield" s={13} /> Open Plans & Billing
            </button>
          </div>

          <div style={{ marginTop: 18 }}>
            <div className="settings-section-label" style={{ marginBottom: 12 }}>Quick summary</div>
            <div className="panel" style={{ padding: '4px 16px', background: 'var(--bg3)' }}>
              {[
                ['Current plan',   'Operator (Admin)'],
                ['Billing cycle',  '—'],
                ['Next invoice',   '—'],
                ['Payment method', '—'],
              ].map(([k, v]) => (
                <div key={k} className="stat-row">
                  <span className="stat-k">{k}</span>
                  <span className="stat-v">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      );

      case 'danger': return (
        <>
          <div className="settings-hdr">
            <div className="settings-hdr-title" style={{ color: 'var(--red)' }}>Danger Zone</div>
            <div className="settings-hdr-sub">Irreversible actions. Proceed with extreme caution.</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            <div className="danger-zone">
              <div className="danger-zone-title">Export your data</div>
              <div className="danger-zone-desc">
                Download a full JSON export of all your brands, content, analytics, and settings before making any destructive changes.
              </div>
              <button className="btn btn-ghost" style={{ color: 'var(--text2)' }}>
                <I n="upload" s={13} /> Export data (coming soon)
              </button>
            </div>

            <div className="danger-zone">
              <div className="danger-zone-title">Delete all data for active brand</div>
              <div className="danger-zone-desc">
                Permanently removes all content, ideas, hooks, campaigns, and analytics for the currently selected brand. This cannot be undone.
              </div>
              <button className="btn btn-danger">
                <I n="trash" s={13} /> Delete brand data
              </button>
            </div>

            <div className="danger-zone">
              <div className="danger-zone-title">Delete account</div>
              <div className="danger-zone-desc">
                Permanently delete your CCC OS account, all brands, all data, and cancel any active subscription. This action is <strong style={{ color: 'var(--red)' }}>irreversible</strong>.
              </div>
              <div className="danger-confirm-row">
                <input
                  className="form-input"
                  style={{ maxWidth: 280, borderColor: deleteConfirm === 'DELETE' ? 'var(--red)' : undefined }}
                  placeholder='Type "DELETE" to confirm'
                  value={deleteConfirm}
                  onChange={e => setDeleteConfirm(e.target.value)}
                />
                <button
                  className="btn btn-danger"
                  disabled={deleteConfirm !== 'DELETE'}
                  style={{ opacity: deleteConfirm === 'DELETE' ? 1 : 0.45, cursor: deleteConfirm === 'DELETE' ? 'pointer' : 'not-allowed' }}
                >
                  <I n="trash" s={13} /> Delete my account
                </button>
              </div>
            </div>

          </div>
        </>
      );

      default: return null;
    }
  };

  return (
    <div className="page">
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontFamily: 'var(--font-d)', fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>Settings</div>
        <div style={{ fontSize: 12.5, color: 'var(--text3)' }}>Manage your account, preferences, and connected platforms.</div>
      </div>

      <div className="settings-layout">
        {/* Left nav */}
        <div className="settings-nav">
          {TABS.map((t, i) => (
            <div key={t.id}>
              {t.danger && <div className="settings-nav-sep" />}
              <div
                className={`settings-nav-item ${tab === t.id ? 'active' : ''} ${t.danger ? 'danger' : ''}`}
                onClick={() => setTab(t.id)}
              >
                <I n={t.icon} s={14} />
                {t.label}
              </div>
            </div>
          ))}
        </div>

        {/* Right panel */}
        <div className="settings-panel">
          {renderTab()}
        </div>
      </div>
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

  // Handle OAuth callback redirects (scheduler platform connections)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthStatus = params.get('oauth');
    const oauthPlatform = params.get('platform');
    if (oauthStatus) {
      window.history.replaceState({}, '', '/');
      sessionStorage.setItem('oauth_result', JSON.stringify({ status: oauthStatus, platform: oauthPlatform }));
      setPage('scheduler');
    }
  }, []);

  // Load brands after auth — restore brand selected before OAuth redirect if applicable
  useEffect(() => {
    if (!user) return;
    api.brands.list().then(b => {
      setBrands(b);
      const returnBrandId = sessionStorage.getItem('oauth_return_brand');
      if (returnBrandId) {
        sessionStorage.removeItem('oauth_return_brand');
        const match = b.find(br => br.id === returnBrandId);
        if (match) { setActiveBrand(match); return; }
      }
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
    { id:'scheduler', label:'Scheduler', icon:'calendar' },
    { id:'studio', label:'Content Studio', icon:'studio', badge:'NEW' },
    ...MODULES,
    { id:'billing', label:'Plans & Billing', icon:'shield' },
    { id:'settings', label:'Settings', icon:'settings' },
  ];
  const PAGE_TITLES = {
    dashboard: 'Command Center',
    scheduler: 'Scheduler',
    billing: 'Plans & Billing',
    studio: 'Content Studio',
    'ai-studio':     'AI Studio',
    'content-advisor': 'Content Advisor',
    'visual-engine': 'Visual Engine',
    'smart-clipper': 'Smart Clipper',
    'carousel-prompts': 'Carousel Prompts',
  'channel-downloader': 'Channel Downloader',
    settings: 'Settings',
  };

  const renderPage = () => {
    const props = { activeBrand, setPage };
    switch(page) {
      case 'dashboard': return <CommandCenter {...props} user={user} onQuickAdd={() => setQuickAdd(true)} />;
      case 'scheduler': return <SchedulerRoom {...props} />;
      case 'studio': return <ContentStudioRoom activeBrand={activeBrand} />;
      default: {
        const mod = MODULES.find(m => m.id === page);
        if (mod) { const Comp = mod.component; return <Comp {...mod.props(activeBrand, user)} />; }
        return null;
      }
      case 'settings': return <SettingsRoom user={user} />;
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

    }
  };

  const pageTitle = PAGE_TITLES[page] || NAV.find(n => n.id === page)?.label || 'Command Center';

  const railHeader = (
    <>
      <div className="rail-logo">
        <div className="rail-logo-mark">C</div>
        <div className="rail-logo-title">Content<br /><span className="s-logo-accent">Command Center</span></div>
      </div>
      {activeBrand && (
        <BrandSelector brands={brands} activeBrand={activeBrand} onSelect={setActiveBrand} />
      )}
    </>
  );

  const railFooter = (
    <>
      {/* Subscription status + usage */}
      {subscription?.active && (
        <div style={{ margin: '10px 4px 8px' }}>
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
      {!subscription?.active && !subscription?.is_admin && user?.is_admin !== 1 && (
        <Button variant="secondary" style={{ width:'100%', marginBottom:8 }} onClick={() => setPage('billing')}>
          <I n="zap" s={13} /> Activate Plan
        </Button>
      )}
      <Button variant="primary" style={{ width:'100%', marginBottom:8 }} onClick={() => setQuickAdd(true)}>
        <I n="zap" s={14} /> Quick Add
      </Button>
      <div className="rail-user">
        <div className="s-avatar">
          {user?.avatar
            ? <img src={user.avatar} alt={user.name} referrerPolicy="no-referrer" />
            : (user?.name || 'U').split(' ').slice(0,2).map(n => n[0]).join('').toUpperCase()
          }
        </div>
        <div className="s-user-info">
          <div className="s-user-name">{user?.name || 'Loading…'}</div>
          <div className="s-user-email">{user?.email || ''}</div>
        </div>
      </div>
      <Button variant="ghost" style={{ width:'100%', marginTop:8 }} onClick={logout}>
        <I n="logout" s={13} /> Sign Out
      </Button>
    </>
  );

  return (
    <>
      <style>{STYLES}</style>
      <div className="shell">
        {/* Floating pill navigation rail */}
        <PillNav
          items={NAV}
          activeId={page}
          onSelect={setPage}
          renderIcon={(item) => <I n={item.icon} s={15} />}
          header={railHeader}
          footer={railFooter}
        />

        {/* Main Content */}
        <div className="main-float">
          <div className="topbar-float">
            <div className="topbar-title">
              {pageTitle}
              {activeBrand && <span className="topbar-sub">— {activeBrand.name}</span>}
            </div>
            <div className="topbar-acts">
              <Button variant="ghost" size="sm" onClick={() => setPage('data')}>
                <I n="review" s={13} /> Weekly Review
              </Button>
              <Button variant="primary" size="sm" onClick={() => setQuickAdd(true)}>
                <I n="plus" s={13} /> New Content
              </Button>
            </div>
          </div>
          <div className="content-scroll">
            {renderPage()}
          </div>
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
