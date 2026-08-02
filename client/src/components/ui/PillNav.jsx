// client/src/components/ui/PillNav.jsx
import { useState } from 'react';
import { colors, radius, font, gradients, glassCard } from '../../lib/theme.js';

const RAIL = {
  width: 236,
  flexShrink: 0,
  display: 'flex',
  flexDirection: 'column',
  ...glassCard,
  borderRadius: 26,
  padding: '18px 14px',
  overflow: 'hidden',
};

function PillItem({ item, active, onSelect, renderIcon }) {
  const [hover, setHover] = useState(false);
  const style = {
    display: 'flex',
    alignItems: 'center',
    gap: 11,
    width: '100%',
    padding: '9px 14px',
    borderRadius: radius.pill,
    border: 'none',
    cursor: 'pointer',
    fontFamily: font.display,
    fontSize: 12.5,
    fontWeight: active ? 700 : 500,
    letterSpacing: '-0.01em',
    textAlign: 'left',
    marginBottom: 3,
    transition: 'all .14s',
    color: active ? colors.bg : hover ? colors.text : colors.text3,
    background: active
      ? gradients.amber
      : hover
      ? 'rgba(212,149,58,0.07)'
      : 'transparent',
    boxShadow: active ? '0 6px 18px rgba(212,149,58,0.28)' : 'none',
  };
  return (
    <button
      type="button"
      style={style}
      onClick={() => onSelect(item.id)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {renderIcon && renderIcon(item, active)}
      <span style={{ flex: 1 }}>{item.label}</span>
      {item.badge && (
        <span
          style={{
            fontFamily: font.mono,
            fontSize: 8.5,
            fontWeight: 700,
            letterSpacing: '0.06em',
            background: active ? 'rgba(12,10,7,0.25)' : colors.accent,
            color: active ? colors.bg : '#fff',
            padding: '2px 6px',
            borderRadius: 999,
          }}
        >
          {item.badge}
        </span>
      )}
    </button>
  );
}

// Floating, glass, pill-item navigation rail.
// items: [{ id, label, icon, badge }] · renderIcon(item, active) is optional.
// header / footer render fixed regions above/below the scrolling item list.
export default function PillNav({
  items = [],
  activeId,
  onSelect,
  renderIcon,
  header = null,
  footer = null,
  style = {},
}) {
  return (
    <nav style={{ ...RAIL, ...style }}>
      {header && <div style={{ flexShrink: 0 }}>{header}</div>}
      <div style={{ flex: 1, overflowY: 'auto', margin: '10px -4px', padding: '0 4px' }}>
        {items.map((it) => (
          <PillItem
            key={it.id}
            item={it}
            active={it.id === activeId}
            onSelect={onSelect}
            renderIcon={renderIcon}
          />
        ))}
      </div>
      {footer && <div style={{ flexShrink: 0 }}>{footer}</div>}
    </nav>
  );
}
