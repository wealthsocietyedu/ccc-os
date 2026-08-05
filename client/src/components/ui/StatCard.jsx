// client/src/components/ui/StatCard.jsx
import { glassCard, colors, font } from '../../lib/theme.js';

// Glass card showing one oversized number with a small uppercase label.
// Optional `delta` renders a pill above the number (green up / red down).
export default function StatCard({
  value,
  label,
  delta,
  deltaUp = true,
  style = {},
  ...rest
}) {
  return (
    <div
      style={{
        ...glassCard,
        padding: '20px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        ...style,
      }}
      {...rest}
    >
      {delta && (
        <span
          style={{
            alignSelf: 'flex-start',
            fontFamily: font.mono,
            fontSize: 10.5,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: deltaUp ? colors.green : colors.red,
            background: deltaUp ? 'rgba(55,184,122,0.12)' : 'rgba(232,53,43,0.12)',
            padding: '3px 9px',
            borderRadius: 999,
          }}
        >
          {delta}
        </span>
      )}
      <div
        style={{
          fontFamily: font.display,
          fontSize: 34,
          fontWeight: 800,
          lineHeight: 1,
          letterSpacing: '-0.03em',
          color: colors.text,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: font.mono,
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: colors.text3,
        }}
      >
        {label}
      </div>
    </div>
  );
}
