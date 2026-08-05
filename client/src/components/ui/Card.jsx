// client/src/components/ui/Card.jsx
import { useState } from 'react';
import { card, glow, colors, radius } from '../../lib/theme.js';

// Solid "glow card" (concept .glow-card / .mod-card): opaque surface, hairline
// border, 22px radius, soft resting shadow. Pass `hover` to enable the lift +
// red-border + shadow-bloom on pointer (used by module/tappable cards); pass
// `glow` for a permanent soft red halo; pass `accent` for the top-right radial
// red-glow blob baked into the concept's hero pipeline card.
export default function Card({
  hover = false,
  glow: glowHalo = false,
  accent = false,
  style = {},
  children,
  ...rest
}) {
  const [hovered, setHovered] = useState(false);
  const composed = {
    ...card,
    padding: 22,
    position: 'relative',
    overflow: 'hidden',
    transition: 'transform .2s, border-color .2s, box-shadow .2s',
    ...(glowHalo ? { boxShadow: `${card.boxShadow}, 0 0 40px rgba(232,53,43,0.14)` } : {}),
    ...(hover && hovered
      ? { transform: 'translateY(-4px)', borderColor: 'rgba(232,53,43,0.40)', boxShadow: glow.card }
      : {}),
    ...style,
  };
  const hoverProps = hover
    ? { onMouseEnter: () => setHovered(true), onMouseLeave: () => setHovered(false) }
    : {};
  return (
    <div style={composed} {...hoverProps} {...rest}>
      {accent && (
        <div
          aria-hidden
          style={{
            position: 'absolute', top: '-40%', right: '-20%', width: 280, height: 280,
            background: `radial-gradient(circle, ${colors.redGlow}, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />
      )}
      {accent ? <div style={{ position: 'relative' }}>{children}</div> : children}
    </div>
  );
}
