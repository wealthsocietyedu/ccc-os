// client/src/components/ui/Card.jsx
import { glassCard } from '../../lib/theme.js';

// Dark glass-morphism card. Pass `glow` to add a soft amber halo.
export default function Card({ glow = false, style = {}, children, ...rest }) {
  const composed = {
    ...glassCard,
    padding: 20,
    ...(glow
      ? { boxShadow: `${glassCard.boxShadow}, 0 0 40px rgba(212,149,58,0.14)` }
      : {}),
    ...style,
  };
  return (
    <div style={composed} {...rest}>
      {children}
    </div>
  );
}
