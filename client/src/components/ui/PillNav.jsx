// client/src/components/ui/PillNav.jsx
import { useState } from 'react';
import { colors, radius, font, gradients, glassCard } from '../../lib/theme.js';
import { useIsMobile } from '../../lib/useIsMobile.js';

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
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  // On mobile, picking an item should also close the drawer.
  const handleSelect = (id) => {
    onSelect(id);
    if (isMobile) setOpen(false);
  };

  const itemList = (
    <div style={{ flex: 1, overflowY: 'auto', margin: '10px -4px', padding: '0 4px' }}>
      {items.map((it) => (
        <PillItem
          key={it.id}
          item={it}
          active={it.id === activeId}
          onSelect={handleSelect}
          renderIcon={renderIcon}
        />
      ))}
    </div>
  );

  // ─── Mobile: off-canvas drawer + hamburger ──────────────────────────────────
  // The 236px rail would eat ~63% of a phone screen, crushing content to a
  // sliver. Instead float a hamburger button and slide the full rail in from
  // the left as an overlay, leaving the main content full-width underneath.
  if (isMobile) {
    return (
      <>
        <button
          type="button"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          style={{
            position: 'fixed', top: 14, left: 14, zIndex: 60,
            width: 44, height: 44, borderRadius: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            ...glassCard, border: `1px solid ${colors.border2}`,
            color: colors.text, fontSize: 18, cursor: 'pointer', padding: 0,
          }}
        >
          {open ? '✕' : '☰'}
        </button>

        {open && (
          <>
            <div
              onClick={() => setOpen(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 55 }}
            />
            <nav
              style={{
                ...RAIL,
                position: 'fixed', top: 0, left: 0, height: '100vh',
                width: '82vw', maxWidth: 300, borderRadius: 0, zIndex: 56,
                paddingTop: 68, // clear the fixed hamburger
              }}
            >
              {header && <div style={{ flexShrink: 0 }}>{header}</div>}
              {itemList}
              {footer && <div style={{ flexShrink: 0 }}>{footer}</div>}
            </nav>
          </>
        )}
      </>
    );
  }

  // ─── Desktop: static rail (unchanged) ───────────────────────────────────────
  return (
    <nav style={{ ...RAIL, ...style }}>
      {header && <div style={{ flexShrink: 0 }}>{header}</div>}
      {itemList}
      {footer && <div style={{ flexShrink: 0 }}>{footer}</div>}
    </nav>
  );
}
