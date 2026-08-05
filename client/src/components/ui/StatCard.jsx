// client/src/components/ui/StatCard.jsx
import { useState } from 'react';
import { glassFloat, colors, font } from '../../lib/theme.js';

// Floating backdrop-blur stat pill (concept .stat-pill): translucent dark fill,
// 12px blur, 18px radius, hover lift. One oversized number with a small mono
// label; optional `delta` renders a mono caption below the number (green up /
// red down). Pass `red` to tint the value with the brand red.
export default function StatCard({
  value,
  label,
  delta,
  deltaUp = true,
  red = false,
  style = {},
  ...rest
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...glassFloat,
        padding: '18px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        transition: 'transform .2s, border-color .2s',
        ...(hovered ? { transform: 'translateY(-3px)', borderColor: colors.text3 } : {}),
        ...style,
      }}
      {...rest}
    >
      <div
        style={{
          fontFamily: font.mono,
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: colors.text3,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: font.display,
          fontSize: 28,
          fontWeight: 800,
          lineHeight: 1,
          letterSpacing: '-0.02em',
          color: red ? colors.accent2 : colors.text,
        }}
      >
        {value}
      </div>
      {delta && (
        <span
          style={{
            fontFamily: font.mono,
            fontSize: 10,
            letterSpacing: '0.03em',
            color: deltaUp ? colors.green : colors.red,
          }}
        >
          {delta}
        </span>
      )}
    </div>
  );
}
