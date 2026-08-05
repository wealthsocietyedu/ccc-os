// client/src/components/ui/Button.jsx
import { useState } from 'react';
import { colors, radius, font, gradients, glow } from '../../lib/theme.js';

const SIZES = {
  sm: { padding: '6px 15px', fontSize: 12 },
  md: { padding: '9px 20px', fontSize: 13 },
  lg: { padding: '12px 26px', fontSize: 14.5 },
};

const VARIANTS = {
  primary: {
    background: gradients.amber,
    color: colors.bg,
    fontWeight: 700,
    boxShadow: glow.amber,
  },
  secondary: {
    background: 'rgba(232,53,43,0.07)',
    color: colors.text,
    border: `1px solid ${colors.border2}`,
    fontWeight: 600,
  },
  ghost: {
    background: 'transparent',
    color: colors.text2,
    border: `1px solid ${colors.border2}`,
    fontWeight: 600,
  },
  danger: {
    background: 'rgba(232,53,43,0.12)',
    color: colors.red,
    border: '1px solid rgba(232,53,43,0.3)',
    fontWeight: 600,
  },
};

const HOVER = {
  primary: { boxShadow: glow.amberStrong, filter: 'brightness(1.05)' },
  secondary: { background: 'rgba(232,53,43,0.14)', borderColor: colors.accent },
  ghost: { background: 'rgba(232,53,43,0.06)', color: colors.text, borderColor: colors.accent },
  danger: { background: colors.red, color: '#fff' },
};

const BASE = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
  borderRadius: radius.pill,
  border: 'none',
  cursor: 'pointer',
  fontFamily: font.display,
  letterSpacing: '-0.01em',
  lineHeight: 1,
  whiteSpace: 'nowrap',
  transition: 'transform .12s, box-shadow .16s, filter .16s, background .16s, color .16s, border-color .16s',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  style = {},
  children,
  ...rest
}) {
  const [hover, setHover] = useState(false);
  const composed = {
    ...BASE,
    ...SIZES[size],
    ...VARIANTS[variant],
    ...(hover && !disabled ? { ...HOVER[variant], transform: 'translateY(-1px)' } : {}),
    ...(disabled ? { opacity: 0.5, cursor: 'not-allowed', boxShadow: 'none' } : {}),
    ...style,
  };
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={composed}
      {...rest}
    >
      {children}
    </button>
  );
}
