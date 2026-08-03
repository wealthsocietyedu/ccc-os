// client/src/lib/useIsMobile.js
// Single source of truth for the app's mobile breakpoint.
//
// Every module renders with inline style={{}} objects (no CSS classes), so a
// plain @media query can't reach their grid templates. This hook lets a
// component react to the SAME 768px breakpoint the dashboard's class-based
// stylesheet uses, so the whole app stacks at one consistent width instead of
// each module inventing its own. Use it to collapse fixed side-by-side grids
// to a single column on phones — see `cols()` below.

import { useState, useEffect } from 'react';

export const MOBILE_BREAKPOINT = 768;

export function useIsMobile(breakpoint = MOBILE_BREAKPOINT) {
  const query = `(max-width: ${breakpoint}px)`;
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  );

  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = (e) => setIsMobile(e.matches);
    setIsMobile(mq.matches); // sync in case the width changed before this ran
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);

  return isMobile;
}

// Pick a grid-template-columns value for the current viewport. Pass the desktop
// template; on mobile it returns `mobile` (default '1fr' = fully stacked). For a
// dense stat row that can keep two columns on a phone, pass an explicit mobile
// value, e.g. cols(isMobile, 'repeat(4, 1fr)', '1fr 1fr').
export const cols = (isMobile, desktop, mobile = '1fr') => (isMobile ? mobile : desktop);
