// client/src/components/ui/Sidebar.jsx
import { useState } from 'react';
import { colors, radius, font, gradients, glow, glassFloat } from '../../lib/theme.js';
import { useIsMobile } from '../../lib/useIsMobile.js';

// Fixed left sidebar (concept .side): sectioned nav with a mono section label
// above each group and gradient + glow on the active item. Replaces the old
// floating PillNav rail while keeping the same mobile behavior — on phones the
// full sidebar slides in from the left as an off-canvas drawer behind a fixed
// hamburger, so the responsive contract from earlier work is preserved.
//
// sections: [{ label, items: [{ id, label, icon, badge }] }]
// renderIcon(item, active) is optional. header / footer render fixed regions.

function SideItem({ item, active, onSelect, renderIcon }) {
  const [hover, setHover] = useState(false);
  const style = {
    display: 'flex',
    alignItems: 'center',
    gap: 11,
    width: '100%',
    padding: '10px 12px',
    borderRadius: radius.nav,
    border: 'none',
    cursor: 'pointer',
    fontFamily: font.display,
    fontSize: 13,
    fontWeight: active ? 700 : 500,
    letterSpacing: '-0.01em',
    textAlign: 'left',
    marginBottom: 2,
    transition: 'all .18s',
    color: active ? '#fff' : hover ? colors.text : colors.text2,
    background: active ? gradients.red : hover ? colors.surface : 'transparent',
    boxShadow: active ? glow.red : 'none',
  };
  return (
    <button
      type="button"
      style={style}
      onClick={() => onSelect(item.id)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {renderIcon && (
        <span style={{ width: 18, display: 'flex', justifyContent: 'center', opacity: active ? 1 : 0.8, flexShrink: 0 }}>
          {renderIcon(item, active)}
        </span>
      )}
      <span style={{ flex: 1 }}>{item.label}</span>
      {item.badge && (
        <span
          style={{
            fontFamily: font.mono,
            fontSize: 8.5,
            fontWeight: 700,
            letterSpacing: '0.06em',
            background: active ? 'rgba(0,0,0,0.28)' : colors.accent,
            color: '#fff',
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

function SectionBlock({ sections, activeId, onSelect, renderIcon }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', margin: '4px -2px', padding: '0 2px' }}>
      {sections.map((sec) => (
        <div key={sec.label} style={{ marginBottom: 6 }}>
          <div
            style={{
              fontFamily: font.mono,
              fontSize: 9,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: colors.text3,
              padding: '14px 12px 6px',
            }}
          >
            {sec.label}
          </div>
          {sec.items.map((it) => (
            <SideItem
              key={it.id}
              item={it}
              active={it.id === activeId}
              onSelect={onSelect}
              renderIcon={renderIcon}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

const SIDE = {
  width: 236,
  flexShrink: 0,
  display: 'flex',
  flexDirection: 'column',
  padding: '20px 14px',
  overflow: 'hidden',
};

export default function Sidebar({
  sections = [],
  activeId,
  onSelect,
  renderIcon,
  header = null,
  footer = null,
}) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const handleSelect = (id) => {
    onSelect(id);
    if (isMobile) setOpen(false);
  };

  const body = (
    <>
      {header && <div style={{ flexShrink: 0 }}>{header}</div>}
      <SectionBlock sections={sections} activeId={activeId} onSelect={handleSelect} renderIcon={renderIcon} />
      {footer && <div style={{ flexShrink: 0 }}>{footer}</div>}
    </>
  );

  // ─── Mobile: off-canvas drawer + hamburger ──────────────────────────────────
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
            ...glassFloat, borderRadius: 14,
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
                ...SIDE,
                position: 'fixed', top: 0, left: 0, height: '100vh',
                width: '82vw', maxWidth: 300, zIndex: 56,
                paddingTop: 68, // clear the fixed hamburger
                background: colors.bg2,
                borderRight: `1px solid ${colors.border}`,
              }}
            >
              {body}
            </nav>
          </>
        )}
      </>
    );
  }

  // ─── Desktop: static sidebar column ─────────────────────────────────────────
  return <nav style={SIDE}>{body}</nav>;
}
