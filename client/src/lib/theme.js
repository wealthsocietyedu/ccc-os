// client/src/lib/theme.js
// Central design tokens for CCC OS — black / red / white theme.
// Mirrors the CSS custom properties defined in App.jsx STYLES so JSX
// components can pull the same values inline.
//
// Key names are kept stable (accent, green, gradients.amber, glow.amber, …)
// so downstream components remap automatically; only the VALUES changed from
// the old amber/teal "TVA" theme. Red is the primary brand accent; green is
// retained ONLY as a success semantic; amber ONLY as a warning semantic.

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
  redGlow: 'rgba(232,53,43,0.22)',
  amber: '#E0A000',       // warning semantic only
  cyan: '#C4C4C4',        // neutral/info (formerly teal decorative)
  white: '#FFFFFF',
  border: '#2A2A2A',
  border2: '#3A3A3A',
  glassBorder: 'rgba(232,53,43,0.14)',
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
  amber: 'linear-gradient(135deg, #E8352B, #FF5449)',
  amberSoft: 'linear-gradient(180deg, rgba(36,36,36,0.55), rgba(20,20,20,0.45))',
};

export const glow = {
  amber: '0 0 24px rgba(232,53,43,0.30)',
  amberStrong: '0 0 40px rgba(232,53,43,0.38)',
};

// Reusable glass-morphism surface: low-opacity dark surface over the page bg,
// subtle red-tinted border, soft shadow, large radius.
export const glassCard = {
  background: gradients.amberSoft,
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: `1px solid ${colors.glassBorder}`,
  borderRadius: radius.lg,
  boxShadow: '0 10px 40px rgba(0,0,0,0.45)',
};

// `glass` is the canonical name for the reusable glass-morphism surface
// (spec alias of glassCard) that downstream screens import.
export const glass = glassCard;

const theme = { colors, radius, space, font, gradients, glow, glassCard, glass };
export default theme;
