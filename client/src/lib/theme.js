// client/src/lib/theme.js
// Central design tokens for CCC OS — black / red / white "Glow" theme.
// Mirrors the CSS custom properties defined in App.jsx STYLES so JSX
// components can pull the same values inline.
//
// This file is the single source of the app's SHAPE language (border-radius
// scale, gradient/glow presets, blur values, card recipes) the same way it is
// already the source of the color language. Rebuilding a surface = pulling
// these presets, never inventing one-off radius/shadow values per component.
//
// Legacy key names (gradients.amber, glow.amber, glassCard, glass) are kept as
// aliases pointing at the new Glow values so older imports keep working while
// the values shift to the concept.

export const colors = {
  bg: '#0A0A0A',
  bg2: '#141414',
  bg3: '#1C1C1C',
  surface: '#1C1C1C',
  surface2: '#242424',
  text: '#F5F5F5',
  text2: '#A0A0A0',
  text3: '#666666',
  accent: '#E8352B',      // primary red — fills, buttons, active states
  accent2: '#FF6B5E',     // lighter red — text/icons on dark (contrast-safe)
  green: '#37B87A',       // success semantic only
  red: '#E8352B',         // brand red == destructive red (context disambiguates)
  redText: '#FF6B5E',
  redDim: '#8C1F19',
  redGlow: 'rgba(232,53,43,0.35)',   // concept glow strength (was 0.22)
  redSub: 'rgba(232,53,43,0.10)',    // faint red fill (icon squares, chips)
  amber: '#E0A000',       // warning semantic only
  cyan: '#C4C4C4',        // neutral/info (formerly teal decorative)
  white: '#FFFFFF',
  border: '#2A2A2A',
  border2: '#3A3A3A',
  glassBorder: 'rgba(232,53,43,0.14)',
};

// ── Border-radius scale ──────────────────────────────────────────────────────
// Extracted verbatim from CCC-OS-Dashboard-Glow-Concept.html. Old sm/md/lg/pill
// keys are preserved; the semantic keys (icon/feed/stat/mod/card) are the ones
// new/rebuilt surfaces should reach for so the whole app shares one scale.
export const radius = {
  sm: 12,   // (Glow) inputs, small controls, list rows  — was 10
  md: 18,   // (Glow) cards, icon squares                 — was 16
  lg: 22,
  pill: 999,
  nav: 12,    // sidebar items, small controls
  icon: 13,   // icon-in-rounded-square (mod-icon 42px → 13, logo 30px → 9–12)
  feed: 14,   // inner rows / feed items / nested cards
  stat: 18,   // floating backdrop-blur stat pills
  mod: 20,    // module cards
  card: 22,   // primary glow cards / panels
};

export const space = {
  xs: 4,
  sm: 8,
  md: 14,
  lg: 22,
  xl: 32,
};

export const font = {
  display: "'Sora', sans-serif",
  mono: "'DM Mono', monospace",
};

// ── Gradients ────────────────────────────────────────────────────────────────
// The concept uses one 135° red gradient for every active/solid surface
// (logo, active nav item, hot pipeline badge, avatars) and a very slightly
// darker one for solid pill buttons.
export const gradients = {
  red: 'linear-gradient(135deg, #E8352B, #B8241C)',
  redSolid: 'linear-gradient(135deg, #E8352B, #C82920)',
  amber: 'linear-gradient(135deg, #E8352B, #B8241C)',  // legacy alias → red
  amberSoft: 'linear-gradient(180deg, rgba(36,36,36,0.55), rgba(20,20,20,0.45))',
};

// ── Glow / shadow presets ────────────────────────────────────────────────────
export const glow = {
  red: '0 6px 20px rgba(232,53,43,0.35)',       // active nav, emphasis
  redSm: '0 4px 16px rgba(232,53,43,0.35)',      // logo mark, solid button
  card: '0 12px 32px rgba(0,0,0,0.40)',          // module-card hover lift
  soft: '0 1px 3px rgba(0,0,0,0.30)',            // resting card shadow
  amber: '0 6px 20px rgba(232,53,43,0.35)',      // legacy alias → red
  amberStrong: '0 0 40px rgba(232,53,43,0.38)',
};

// ── Backdrop blur ─────────────────────────────────────────────────────────────
export const blur = {
  glass: 'blur(16px)',   // topbar pill
  float: 'blur(12px)',   // floating stat pills
};

// Solid "glow card" surface (concept .glow-card / .mod-card): opaque panel,
// hairline border, large radius, soft resting shadow. NOT translucent — the
// blur is reserved for genuinely floating elements (topbar, stat pills).
export const card = {
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: radius.card,
  boxShadow: glow.soft,
};

// Floating backdrop-blur surface (concept .stat-pill / .topbar): translucent
// dark fill over the page's red-glow wash, blurred, hairline border.
export const glassFloat = {
  background: 'rgba(28,28,28,0.82)',
  backdropFilter: blur.float,
  WebkitBackdropFilter: blur.float,
  border: `1px solid ${colors.border}`,
  borderRadius: radius.stat,
};

// Legacy glass-morphism surface name kept for back-compat. Points at the
// floating-glass recipe at card radius so existing `glassCard`/`glass`
// consumers (Card, StatCard) still resolve — those components override the
// pieces they need.
export const glassCard = {
  background: 'rgba(28,28,28,0.82)',
  backdropFilter: blur.glass,
  WebkitBackdropFilter: blur.glass,
  border: `1px solid ${colors.border}`,
  borderRadius: radius.card,
  boxShadow: '0 10px 40px rgba(0,0,0,0.45)',
};
export const glass = glassCard;

const theme = { colors, radius, space, font, gradients, glow, blur, card, glassFloat, glassCard, glass };
export default theme;
