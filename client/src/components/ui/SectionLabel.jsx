// client/src/components/ui/SectionLabel.jsx
import { colors, font } from '../../lib/theme.js';

// Small uppercase pill tag placed above section headings.
export default function SectionLabel({ children, style = {}, ...rest }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontFamily: font.mono,
        fontSize: 10.5,
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '0.14em',
        color: colors.accent2,
        background: 'rgba(212,149,58,0.08)',
        border: `1px solid ${colors.glassBorder}`,
        borderRadius: 999,
        padding: '4px 12px',
        ...style,
      }}
      {...rest}
    >
      {children}
    </span>
  );
}
