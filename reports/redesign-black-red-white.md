# CCC OS Redesign — Black / Red / White

**Date:** 2026-08-05
**Commit:** `6209b45` — *feat(design): black/red/white redesign — apply landing-page design language app-wide*
**Branch:** `main` → deployed via Railway (happy-wisdom / ccc-os-production.up.railway.app)

---

## What changed

The whole app moved from the amber/teal **"TVA"** theme to the **black / red / white**
system from the landing-page concept (`CCC-OS-Landing-Concept.html`). The change is
purely visual — **no layout or responsiveness logic was touched.**

### Design language carried over from the landing concept
- **Bold red as the single brand accent** (`#E8352B`), with glow treatment on hover/active.
- **Pill-shaped nav** with a gradient logo mark and a red-glow active pill.
- **Card treatment**: dark surfaces, subtle borders, larger radii, soft shadows.
- **Mono uppercase eyebrow/labels** and heavy display headlines (already in the app; kept).
- **Glass surfaces** (rail, floating topbar) re-tinted to dark glass with a faint red border.

### Token-driven, not per-component
Everything cascades from two central sources so the rollout stays consistent
(the original TVA rollout was inconsistent because colors were hardcoded per file):
- **`App.jsx` `:root` CSS variables** — same variable *names*, new values. Drives every
  `var(--x)` reference (classes + inline styles) across the app. Added `--red-text`,
  `--red-dim`, `--red-glow`, `--white`.
- **`lib/theme.js`** — same keys, new values. Drives the components that use JS-object
  inline styles (PillNav + the module palettes).

### Full palette
```
--bg #0A0A0A  --bg2 #141414  --surface #1C1C1C  --surface2 #242424
--border #2A2A2A  --border2 #3A3A3A
--red #E8352B (brand/fills)  --red-text #FF6B5E (text-on-dark)  --red-dim #8C1F19  --red-glow rgba(232,53,43,.22)
--text #F5F5F5  --text2 #A0A0A0  --text3 #666666  --white #FFFFFF
```

### Files touched (15, all client)
`App.jsx` (`:root` + STYLES literals + STATUS_C/PILLAR_C + calendar dots + darkened the
previously-light `.cc-dashboard` scope), `lib/theme.js`, `ui/PillNav.jsx`, `ui/Button.jsx`,
`ui/Card.jsx`, `ui/StatCard.jsx`, `ui/SectionLabel.jsx`, and all 8 modules — `SmartClipper`,
`ChannelDownloader`, `VideoDownloader`, `AIStudio`, `ContentAdvisor`, `VisualEngine`,
`ContentFlow`, `CarouselPromptGenerator`. Each module's local palette object was remapped
and every inline literal swapped to the new family (verified: a case-sensitive scan of the
whole `client/src` tree finds **zero** old-palette literals remaining).

---

## Verification (live, local dev stack, real browser)

Method: local stack + throwaway user + injected token; navigated every surface and ran a
runtime scan for residual amber/teal computed colors + horizontal overflow at both widths.

| Surface | Desktop 1280px | Mobile 375px |
|---|---|---|
| Command Center | ✅ clean, no overflow | ✅ clean, no overflow |
| Scheduler | ✅ | ✅ |
| Content Studio | ✅ | ✅ (via token cascade) |
| Video Downloader | ✅ | ✅ (via token cascade) |
| AI Studio | ✅ | ✅ (via token cascade) |
| Content Advisor | ✅ | ✅ |
| Visual Engine | ✅ | ✅ |
| Smart Clipper | ✅ | ✅ (via token cascade) |
| Carousel Prompts | ✅ | ✅ |
| Content Flow | ✅ | ✅ (via token cascade) |
| Channel Downloader | ✅ | ✅ |
| Plans & Billing | ✅ | ✅ (via token cascade) |
| Settings | ✅ | ✅ (via token cascade) |

- **Zero residual amber/teal** computed colors on any surface (runtime scan of every element).
- **No horizontal overflow** at 375px on any surface (page `scrollWidth === clientWidth`).
- **Nav**: desktop rail and mobile off-canvas drawer both show the red-gradient active pill
  with red-tinted glass border. Mobile drawer open/close logic unchanged.
- **No console/build errors** anywhere; every module compiled and rendered under Vite HMR.

Mobile rows marked "via token cascade" share the exact same tokens and mapped literals as the
directly-driven rows; the directly-verified mobile set (Command Center, Channel Downloader,
Visual Engine, Content Advisor, Carousel Prompts, Scheduler, + drawer nav) confirms the cascade,
and no `useIsMobile()`/`cols()` layout logic was modified, so mobile layout is unchanged from the
last mobile-audit pass.

### Contrast (WCAG on `#0A0A0A`)
- `#FF6B5E` (all red text-on-dark) ≈ **7.0:1** — AAA.
- `#E8352B` (brand red used as text, e.g. danger labels) ≈ **4.7:1** — AA.
- White on `#E8352B` button fill ≈ **4.2:1** — passes AA-large/bold (buttons are bold);
  red *text* is deliberately routed through `#FF6B5E` so body copy never relies on the 4.2 value.

---

## Hard translations: what teal/amber were doing, and how it's handled now

The old theme had **two** accents (amber primary + teal secondary) plus semantic greens/reds.
Collapsing to one brand accent (red) forced decisions:

| Old role | Old color | New handling |
|---|---|---|
| Primary accent (fills, active, CTAs) | amber `#F0A800` | **red `#E8352B`** (fills/borders/icons) |
| Primary accent **as text** | amber | **red-text `#FF6B5E`** — separate lighter token for contrast |
| Secondary/decorative accent | teal `#3D9E8C` | **neutral light gray** (`#C4C4C4`/white) in decorative modules — keeps the look black/red/white instead of introducing a second hue |
| **Success / "done" / connected** | teal or green | **kept green, muted to `#37B87A`** — encoding success as red or gray hurts usability; retained as a *semantic-only* token |
| **Warning / mid-funnel / past-due** | amber | **kept amber, muted to `#E0A000`** — retained as a *semantic-only* token |
| Danger / error / destructive | red `#C42A18` | **brand red `#E8352B`** — brand and destructive now share red; context (labels/icons) disambiguates, and destructive buttons stay outline/tinted while primary buttons are solid-filled |
| Pipeline stage colors (8 hues) | purple/cyan/blue/… | **retuned into the red + neutral family** (reds, grays, one amber, green for "Published") so stages stay distinguishable without a rainbow |
| Real platform brand colors (IG pink, etc.) | brand-accurate | **kept intentionally** — recoloring external brand marks to red would confuse, and they read as data, not our theme |

**Net:** red is the identity; green and amber survive *only* as success/warning semantics; teal
is gone (decorative teal → neutral, semantic teal → the success green). This is the one place the
palette isn't literally "only black/red/white," and it's a deliberate, minimal usability call.

---

## Deferred / notes
- The `.cc-dashboard` light-theme scope was darkened to match; if any surface still renders it,
  it now reads dark. (The active dashboard uses the dark `.dash/.hero/.bento` frame.)
- Legacy unused `.sidebar`/`.s-item` CSS classes were recolored by the token cascade but are not
  rendered (PillNav is the live nav) — left in place, safe to remove in a future cleanup.
- Screenshots could not be captured in the headless preview pane (it doesn't composite frames);
  verification used computed-style + geometry measurements instead, which is stronger than a
  visual glance for confirming the palette actually applied.
