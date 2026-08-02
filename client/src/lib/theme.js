// client/src/lib/theme.js
// Central design tokens for CCC OS — amber-on-near-black "TVA" theme.
// Mirrors the CSS custom properties defined in App.jsx STYLES so JSX
// components can pull the same values inline.

export const colors = {
  bg: '#0C0A07',
  bg2: '#141108',
  bg3: '#1A1610',
  surface: '#1A1610',
  surface2: '#231E16',
  text: '#F0EBE0',
  text2: '#A89880',
  text3: '#6B5E4E',
  accent: '#D4953A',
  accent2: '#F0A800',
  green: '#3D9E8C',
  red: '#C42A18',
  cyan: '#6ECFBF',
  border: 'rgba(212,149,58,0.08)',
  border2: 'rgba(212,149,58,0.18)',
  glassBorder: 'rgba(212,149,58,0.12)',
};

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  pill: 999,
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

export const gradients = {
  amber: 'linear-gradient(135deg, #D4953A, #F0A800)',
  amberSoft: 'linear-gradient(180deg, rgba(36,30,22,0.55), rgba(26,22,16,0.45))',
};

export const glow = {
  amber: '0 0 24px rgba(212,149,58,0.30)',
  amberStrong: '0 0 40px rgba(240,168,0,0.35)',
};

// Reusable glass-morphism surface: low-opacity surface over the page bg,
// subtle amber border, soft shadow, large radius.
export const glassCard = {
  background: gradients.amberSoft,
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: `1px solid ${colors.glassBorder}`,
  borderRadius: radius.lg,
  boxShadow: '0 10px 40px rgba(0,0,0,0.35)',
};

// `glass` is the canonical name for the reusable glass-morphism surface
// (spec alias of glassCard) that downstream screens import.
export const glass = glassCard;

const theme = { colors, radius, space, font, gradients, glow, glassCard, glass };
export default theme;
