// client/src/components/ui/SectionLabel.jsx
import { colors, font } from '../../lib/theme.js';

// Eyebrow pill placed above section headings (concept .eyebrow / .card-badge).
// Mono, uppercase, red text on a faint panel chip. Pass `dot` to prepend the
// glowing red status dot from the concept's hero eyebrow.
export default function SectionLabel({ children, dot = false, style = {}, ...rest }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: dot ? 8 : 0,
        fontFamily: font.mono,
        fontSize: 10.5,
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '0.10em',
        color: colors.accent2,
        background: colors.redSub,
        border: `1px solid rgba(232,53,43,0.25)`,
        borderRadius: 999,
        padding: dot ? '6px 14px' : '5px 12px',
        ...style,
      }}
      {...rest}
    >
      {dot && (
        <span
          aria-hidden
          style={{
            width: 6, height: 6, borderRadius: '50%',
            background: colors.accent,
            boxShadow: `0 0 8px ${colors.accent}`,
            flexShrink: 0,
          }}
        />
      )}
      {children}
    </span>
  );
}
