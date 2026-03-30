import { useState } from 'react';

// ─── Constants ────────────────────────────────────────────────────────────────

const PILLARS = [
  'Faith and Life Philosophy',
  'Mental Health and Living Well',
  'Physical Health and Lifestyle',
  'AI and Content Creation',
];

const HOOK_TYPES = [
  { label: 'Paradox', example: 'The more you try to control it, the more it controls you.' },
  { label: 'Reversal', example: 'Everyone told me to work harder. I did. It made everything worse.' },
  { label: 'Number Promise', example: 'I changed one thing. Everything else followed.' },
  { label: 'Moral Dilemma', example: 'Was I wrong for walking away from something good?' },
  { label: 'Prophetic Fragment', example: 'That was the last morning I woke up that way. I didn\'t know it yet.' },
];

const CTA_OPTIONS = [
  'Follow for more',
  'Type WISDOM for more',
  'Type TRUTH for more',
  'Type ROOTS for more',
  'Type CLARITY for more',
  'Link in bio',
  'Substack in bio',
  'Save this post',
];

const SLIDE_TYPES = [
  { id: 'hook1',       label: 'Slide 1 — Hook (Cover)',          phase: 'H', phaseLabel: 'HOOK' },
  { id: 'hook2',       label: 'Slide 2 — Hook (Pain Deep Dive)', phase: 'H', phaseLabel: 'HOOK' },
  { id: 'explain1',    label: 'Slide 3 — Explain (The Why)',     phase: 'E', phaseLabel: 'EXPLAIN' },
  { id: 'explain2',    label: 'Slide 4 — Explain (The Truth)',   phase: 'E', phaseLabel: 'EXPLAIN' },
  { id: 'illustrate1', label: 'Slide 5 — Illustrate (Story)',    phase: 'I', phaseLabel: 'ILLUSTRATE' },
  { id: 'illustrate2', label: 'Slide 6 — Illustrate (Proof)',    phase: 'I', phaseLabel: 'ILLUSTRATE' },
  { id: 'teach1',      label: 'Slide 7 — Teach (Conviction)',    phase: 'T', phaseLabel: 'TEACH' },
  { id: 'teach2',      label: 'Slide 8 — Teach (CTA)',           phase: 'T', phaseLabel: 'TEACH' },
];

const PHASE_ACCENT = {
  H: '#F0A800',  // amber — CCC OS primary
  E: '#3D9E8C',  // teal — CCC OS secondary
  I: '#D4953A',  // burnt orange
  T: '#7C6F5A',  // warm muted
};

const PHASE_INFO = {
  H: { label: 'HOOK',       color: '#F0A800', slides: 'Slides 1–2', desc: 'Pain and recognition' },
  E: { label: 'EXPLAIN',    color: '#3D9E8C', slides: 'Slides 3–4', desc: 'The why and the truth' },
  I: { label: 'ILLUSTRATE', color: '#D4953A', slides: 'Slides 5–6', desc: 'Story and proof' },
  T: { label: 'TEACH',      color: '#7C6F5A', slides: 'Slides 7–8', desc: 'Conviction and CTA' },
};

// ─── Prompt Generator ─────────────────────────────────────────────────────────

function generatePrompts(form) {
  const {
    topic, pillar, hookType, hookLine, pain, painSpiral,
    whyItHappens, truthStatement, story, proof, conviction,
    ctaType, audience
  } = form;

  return {
    hook1: `SLIDE 1 — HOOK: COVER
═══════════════════════════════
FRAMEWORK PHASE: Hook — Open the loop. Make them feel seen before they swipe.
GOAL: Stop the scroll. One line. Maximum curiosity or recognition.
═══════════════════════════════

Background: Pure white (#FFFFFF)
Layout: Centered, vertical stack
Slide size: 1080 x 1350px

TOP ELEMENT:
  Brand wordmark or "The Conviction Series"
  — Small, gray (#999), top center

HEADLINE STRUCTURE:
  "${hookLine || '[Your hook line — the line that opens the loop]'}"

  Typography treatment:
  — Key phrase → Bold black text INSIDE a rounded rectangle (black fill, white text)
  — Supporting words → Large gray text (#AAAAAA), same size, outside the box
  — Headline weight: ExtraBold or 900
  — No em dashes anywhere

VISUAL (below headline):
  3D icon relevant to ${topic || 'the topic'}
  Gemini image prompt:
  "3D ${topic || '[relevant object]'} icon, minimal, pure white background, soft drop shadow underneath, studio lighting from above, glossy or matte material, high render quality, no text, centered composition"

HOOK TYPE SELECTED: ${hookType}
PILLAR: ${pillar}`,

    hook2: `SLIDE 2 — HOOK: PAIN DEEP DIVE
═══════════════════════════════
FRAMEWORK PHASE: Hook — Validate the reader's exact experience. No solution yet.
GOAL: The reader thinks "this is me." That's the only job of this slide.
═══════════════════════════════

Background: Pure white (#FFFFFF)
Layout: Centered, vertical stack
Slide size: 1080 x 1350px

TOP ELEMENT:
  Single large emoji — the emotional state, not the topic
  Choose based on the pain: 😮‍💨 😶 😩 🫠 😔 😤
  — Centered, large, top third of slide

HEADLINE (bold black, centered):
  "${pain ? `"${pain.split('.')[0]}..."` : '"[The exact thought the reader has had — their words, not yours]"'}"
  — This is their internal monologue. Verbatim. Present tense. Ends with "..."

BODY (gray, centered, short lines):
  "${painSpiral || '[Line 1: The first consequence of the pain]\n  [Line 2: What they tried. What didn\'t work.]\n  [Line 3: The emotional cost]\n  [Line 4: The resignation.]'}"

  — Each line is 1 sentence max. No advice. No solution.

BOTTOM: "Swipe →" — small, gray, bottom center

TOPIC: ${topic || '[your topic]'}
AUDIENCE: ${audience || '[your specific audience]'}`,

    explain1: `SLIDE 3 — EXPLAIN: THE WHY
═══════════════════════════════
FRAMEWORK PHASE: Explain — Give them the real reason it's been hard.
GOAL: Reframe the problem. They weren't failing — they were working from the wrong understanding.
═══════════════════════════════

Background: Pure white (#FFFFFF)
Layout: Centered OR two-column
Slide size: 1080 x 1350px

HEADLINE (bold black):
  "Here's why it kept happening."
  OR: "The real reason [${topic || 'this'} feels so hard]."

BODY (gray, centered, short paragraphs):
  "${whyItHappens || '[Paragraph 1: Name the real underlying reason — not the symptom, the root]\n  [Paragraph 2: Why conventional wisdom misses this]\n  [Paragraph 3: The specific mechanism — what actually happens under the surface]'}"

BOLD ACCENT LINE (in black, mid-slide):
  "[The one sentence that reframes the whole problem — the 'ohhhh' moment]"

BOTTOM: "Swipe →" — small, gray, bottom center

PILLAR: ${pillar}
TOPIC: ${topic || '[your topic]'}`,

    explain2: `SLIDE 4 — EXPLAIN: THE TRUTH
═══════════════════════════════
FRAMEWORK PHASE: Explain — Deliver the insight. The core truth that makes everything make sense.
GOAL: This is the intellectual payoff. "I never thought of it that way."
═══════════════════════════════

Background: Pure white (#FFFFFF)
Layout: Centered, clean
Slide size: 1080 x 1350px

THIS IS THE PIVOT SLIDE.

TRUTH STATEMENT (displayed prominently):
  "${truthStatement || '[State the core truth of your content — one to two sentences, plain language, no hedging]'}"
  — If using a pull quote card: render this inside a bordered box

HEADLINE (bold black, centered):
  "Then I understood something."
  OR: "Here's the truth most people never reach."

BODY (gray, below the truth):
  — What this actually means in practice
  — How it recontextualizes slides 2 and 3
  — 2-3 short lines

CONVICTION LINE (bold black, below body):
  "${conviction || '[Your conviction line — the single most shareable sentence in this carousel]'}"
  — Short. Final-feeling. Could stand alone as a post.

BOTTOM: "Swipe →" — small, gray, bottom center`,

    illustrate1: `SLIDE 5 — ILLUSTRATE: THE STORY
═══════════════════════════════
FRAMEWORK PHASE: Illustrate — Show it, don't just say it.
GOAL: Make the abstract truth from Slide 4 feel real and lived-in.
═══════════════════════════════

Background: Pure white (#FFFFFF)
Layout: Two-column (preferred) OR centered
Slide size: 1080 x 1350px

HEADLINE (bold black):
  "Here's what this looked like."
  OR: "I watched someone [specific action related to ${topic || 'the topic'}]."

STORY BODY (gray, personal or observational):
  "${story || '[A specific, concrete moment or scenario that shows the truth from Slide 4 in action]\n  \n  Not an abstract example — a scene.\n  A person. A decision. A moment before and after.\n  \n  Keep it tight — 4-6 lines max. Short sentences. Present tense feels more immediate.]'}"

CLOSING LINE (bold, bottom of story):
  "And something shifted."
  OR: "That was the moment it stopped being theory."

BOTTOM: "Swipe →" — small, gray, bottom center

PILLAR: ${pillar}`,

    illustrate2: `SLIDE 6 — ILLUSTRATE: THE PROOF
═══════════════════════════════
FRAMEWORK PHASE: Illustrate — Show the specific result. Evidence that the truth works.
GOAL: Move from story to specificity. What actually changed.
═══════════════════════════════

Background: Pure white (#FFFFFF)
Layout: Centered OR two-column
Slide size: 1080 x 1350px

HEADLINE (bold black, centered):
  "Here's what actually changed."
  OR: "It's not just [surface benefit]. It's [deeper result]."

PROOF CONTENT (gray, centered):
  "${proof || '[Line 1: The specific observable change — measurable if possible]\n  [Line 2: What became easier or unnecessary]\n  [Line 3: The unexpected secondary benefit]\n  [Line 4: Who this specifically helps most]'}"

BOLD ACCENT LINE (mid-body):
  "[The result that surprised even them]"

AUDIENCE CALL (if applicable):
  "If you have [ADHD / anxiety / a full calendar / a tendency to overthink], this was built for you."
  — Name the specific person: ${audience || '[your audience]'}

BOTTOM: "Swipe →" — small, gray, bottom center`,

    teach1: `SLIDE 7 — TEACH: CONVICTION LANDING
═══════════════════════════════
FRAMEWORK PHASE: Teach — Land the lesson. The transformation stated plainly.
GOAL: This is the save slide. The screenshot slide. The slide people send to someone else.
═══════════════════════════════

Background: Pure white (#FFFFFF)
Layout: Centered — most human, most open slide in the carousel
Slide size: 1080 x 1350px

VISUAL (top, prominent):
  Hand-drawn doodle illustration — joyful, relieved, or quietly at peace
  Gemini prompt: "simple black line art illustration of a person with arms raised in relief, peaceful expression, white background, hand-drawn style, slightly imperfect lines, no color, no shading"

HEADLINE (bold black, centered):
  "Here's what changed for me."
  OR: "What I learned from [${topic || 'this'}]."

BODY FORMAT:
  Before state — one line (gray)
  The shift — one line (gray)
  After state — one line (BOLD BLACK — this is the conviction line)
  Compound effect — one line (gray)

CONVICTION LINE (bold black, centered, slightly larger):
  "${conviction || '[The single most shareable sentence in this carousel — write it last]'}"

  — This is the screenshot moment.
  — Should stand alone as a post, a caption, or a quote card.
  — Short. Final-feeling. Inevitable. No em dashes.

CLOSING LINE (gray, smaller):
  "That compounds into something you won't recognize in 6 months."

BOTTOM: "Swipe →" — small, gray, bottom center`,

    teach2: `SLIDE 8 — TEACH: CTA
═══════════════════════════════
FRAMEWORK PHASE: Teach — One clear next step. Low friction. Give them somewhere to go.
GOAL: Convert emotional state from Slide 7 into a single action.
═══════════════════════════════

Background: Pure white (#FFFFFF)
Layout: Centered, conversion-focused
Slide size: 1080 x 1350px

HEADLINE (bold black, large):
  ${ctaType === 'Follow for more' ? '"Ancient truth.\\nModern context."' :
    ctaType === 'Save this post' ? '"Save this.\\nCome back to it."' :
    ctaType === 'Substack in bio' ? '"The full essay\\nis in the bio."' :
    ctaType === 'Link in bio' ? '"There\'s more\\nin the bio."' :
    `"Type ${ctaType.replace('Type ', '').replace(' for more', '').replace(' in bio', '')}.\\nI'll send it to you."`}

SUBHEADLINE (gray, centered):
  ${ctaType.includes('Type') ?
    `"If this landed — type ${ctaType.replace('Type ', '').replace(' for more', '')} in the comments and I'll send you [what they receive — be specific]."` :
    ctaType === 'Substack in bio' ? '"Every week. One idea. Ancient truth in modern language. Free to read."' :
    ctaType === 'Save this post' ? '"The carousel you\'ll want when the feeling comes back."' :
    '"If this helped — there\'s more where this came from. Every week."'}

CTA BUTTON (Canva element):
  Shape: Rounded rectangle, black fill, white text
  Text: "${ctaType}"
  Size: Medium-large, center aligned, generous padding

═══════════════════════════════
CAPTION TO PAIR WITH THIS CAROUSEL
═══════════════════════════════

Line 1 (hook — no warmup):
${hookLine || '[Your hook line]'}

→ [What most people do about ${topic || 'this'}]
→ [What they're told to try]
→ [Why it still doesn't work]

[The reversal — one sentence]

[Sentence 1: The problem restated with more weight]
[Sentence 2: The emotional cost of staying stuck]
[Sentence 3: The question that earns the swipe]

${ctaType.includes('Type') ?
  `"Type ${ctaType.replace('Type ', '').replace(' for more', '')} and I'll send you [what they get — be specific]."` :
  '"Swipe to see [exactly what they\'ll find — not vague, specific]."'}

Hashtags (5-6, niche-specific, no #fyp):
#[pillar tag] #[topic tag] #[niche identity tag] #convictionseries #[platform tag]

═══════════════════════════════
FULL CAROUSEL HEIT MAP
═══════════════════════════════
H — Hook:       Slide 1 (cover) + Slide 2 (pain deep dive)
E — Explain:    Slide 3 (the why) + Slide 4 (the truth / pivot)
I — Illustrate: Slide 5 (story) + Slide 6 (proof)
T — Teach:      Slide 7 (conviction landing) + Slide 8 (CTA)

Topic: ${topic || '[not set]'}
Pillar: ${pillar}
Hook type: ${hookType}
CTA: ${ctaType}`,
  };
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CarouselPromptGenerator() {
  const [form, setForm] = useState({
    topic: '',
    pillar: PILLARS[0],
    hookType: HOOK_TYPES[0].label,
    hookLine: '',
    pain: '',
    painSpiral: '',
    whyItHappens: '',
    truthStatement: '',
    story: '',
    proof: '',
    conviction: '',
    ctaType: CTA_OPTIONS[0],
    audience: '',
  });

  const [activeSlide, setActiveSlide] = useState('hook1');
  const [generated, setGenerated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedSlide, setCopiedSlide] = useState(false);
  const [copiedInline, setCopiedInline] = useState(false);
  const [prompts, setPrompts] = useState({});

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleGenerate = () => {
    setPrompts(generatePrompts(form));
    setGenerated(true);
    setActiveSlide('hook1');
  };

  const handleCopy = () => {
    const all = SLIDE_TYPES.map(s =>
      `${'═'.repeat(50)}\n${s.label.toUpperCase()}\n${'═'.repeat(50)}\n\n${prompts[s.id]}`
    ).join('\n\n\n');
    navigator.clipboard.writeText(all);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopySlide = () => {
    navigator.clipboard.writeText(prompts[activeSlide]);
    setCopiedSlide(true);
    setTimeout(() => setCopiedSlide(false), 2000);
  };

  const activeSlideData = SLIDE_TYPES.find(s => s.id === activeSlide);
  const activePhase = activeSlideData?.phase;

  const formFields = [
    { key: 'topic',         label: 'Topic / Core Idea',           placeholder: 'e.g. overthinking, rest, identity, discipline, prayer', rows: 2 },
    { key: 'audience',      label: 'Specific Audience',           placeholder: 'e.g. people who want to grow but feel spiritually stuck', rows: 2 },
    { key: 'hookLine',      label: 'Hook Line — Slide 1',         placeholder: 'e.g. Most people try harder. I tried less. My output doubled.', rows: 2, phase: 'H' },
    { key: 'pain',          label: "Reader's Pain — Slide 2",     placeholder: "e.g. I kept trying to be consistent and kept falling off...", rows: 2, phase: 'H' },
    { key: 'painSpiral',    label: 'Pain Spiral — Slide 2 Body',  placeholder: "e.g. They'd go hard for two weeks. Then burn out. Then start over.", rows: 3, phase: 'H' },
    { key: 'whyItHappens',  label: 'Why It Happens — Slide 3',    placeholder: "e.g. The problem isn't discipline. It's that they're building on fear of failure instead of identity.", rows: 3, phase: 'E' },
    { key: 'truthStatement',label: 'Core Truth — Slide 4',        placeholder: 'e.g. Discipline built on shame collapses under pressure. Discipline built on identity compounds.', rows: 3, phase: 'E' },
    { key: 'story',         label: 'Story or Moment — Slide 5',   placeholder: 'e.g. A friend showed me their to-do list. 34 items. They\'d finished 3. They weren\'t lazy — they were paralyzed.', rows: 3, phase: 'I' },
    { key: 'proof',         label: 'What Changed / Proof — Slide 6', placeholder: 'e.g. They stopped measuring progress by task count. Started measuring by follow-through on what mattered.', rows: 3, phase: 'I' },
    { key: 'conviction',    label: 'Conviction Line — Slide 7',   placeholder: "e.g. You don't need more discipline. You need a reason that survives a hard day.", rows: 2, phase: 'T' },
  ];

  // ── Styles ──────────────────────────────────────────────────────────────────

  const s = {
    // Layout
    container: {
      display: 'flex',
      flexDirection: 'column',
      background: '#0C0A07',
      color: '#E8DCC8',
      fontFamily: 'Sora, sans-serif',
      minHeight: '100vh',
    },
    header: {
      borderBottom: '1px solid #1E1A14',
      padding: '20px 32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: '#0C0A07',
      position: 'sticky',
      top: 0,
      zIndex: 20,
    },
    headerLeft: { display: 'flex', alignItems: 'center', gap: '16px' },
    pageTitle: { fontSize: '18px', fontWeight: '700', color: '#F0A800', letterSpacing: '-0.02em' },
    pageSubtitle: { fontSize: '13px', color: '#5A5040', fontFamily: 'DM Mono, monospace' },
    badge: {
      padding: '3px 10px',
      background: '#1A1510',
      borderRadius: '4px',
      fontSize: '10px',
      color: '#5A5040',
      letterSpacing: '2px',
      textTransform: 'uppercase',
      fontFamily: 'DM Mono, monospace',
    },
    divider: { width: '1px', height: '20px', background: '#1E1A14' },
    body: { display: 'flex', flex: 1, overflow: 'hidden' },

    // Left panel
    leftPanel: {
      width: '300px',
      minWidth: '300px',
      borderRight: '1px solid #1E1A14',
      overflowY: 'auto',
      padding: '20px 16px 40px',
    },
    fieldLabel: {
      display: 'block',
      fontSize: '10px',
      color: '#5A5040',
      letterSpacing: '2px',
      textTransform: 'uppercase',
      marginBottom: '6px',
      fontFamily: 'DM Mono, monospace',
    },
    select: {
      width: '100%',
      background: '#110F0A',
      border: '1px solid #1E1A14',
      borderRadius: '6px',
      color: '#C8B897',
      padding: '9px 12px',
      fontSize: '12px',
      fontFamily: 'Sora, sans-serif',
      outline: 'none',
      marginBottom: '4px',
      cursor: 'pointer',
    },
    textarea: {
      width: '100%',
      background: '#0E0C09',
      border: '1px solid #1E1A14',
      borderRadius: '6px',
      color: '#C8B897',
      padding: '9px 11px',
      fontSize: '12px',
      resize: 'vertical',
      fontFamily: 'Sora, sans-serif',
      lineHeight: '1.5',
      boxSizing: 'border-box',
      outline: 'none',
    },
    generateBtn: {
      width: '100%',
      padding: '13px',
      background: 'linear-gradient(135deg, #F0A800, #D4953A)',
      color: '#0C0A07',
      border: 'none',
      borderRadius: '8px',
      fontSize: '13px',
      fontWeight: '800',
      cursor: 'pointer',
      letterSpacing: '1px',
      textTransform: 'uppercase',
      fontFamily: 'Sora, sans-serif',
      marginTop: '4px',
    },
    hookExample: {
      marginTop: '6px',
      fontSize: '11px',
      color: '#3A3020',
      fontStyle: 'italic',
      lineHeight: '1.5',
      fontFamily: 'DM Mono, monospace',
    },
    phaseDivider: { height: '1px', background: '#1A1510', margin: '16px 0' },
    phaseHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '14px',
      paddingBottom: '8px',
    },
    phaseBadge: (color) => ({
      width: '22px', height: '22px',
      borderRadius: '5px',
      background: color + '22',
      border: `1px solid ${color}44`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '11px', fontWeight: '800',
      color,
    }),

    // Right panel
    rightPanel: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
    emptyState: {
      flex: 1,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      color: '#2A2218', textAlign: 'center', padding: '40px',
    },
    emptyTitle: { fontSize: '44px', marginBottom: '16px', letterSpacing: '-2px', color: '#1E1810' },
    emptyCards: {
      marginTop: '40px', display: 'grid',
      gridTemplateColumns: '1fr 1fr', gap: '12px',
      maxWidth: '400px', width: '100%',
    },
    emptyCard: (color) => ({
      padding: '16px', background: '#0F0D0A',
      borderRadius: '8px', border: `1px solid ${color}22`,
      textAlign: 'left',
    }),

    // Output area
    slideNav: {
      borderBottom: '1px solid #1E1A14',
      padding: '12px 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: '8px', flexWrap: 'wrap',
    },
    slideBtn: (isActive, color) => ({
      padding: '5px 11px',
      borderRadius: '6px',
      border: isActive ? `1px solid ${color}` : '1px solid #1E1A14',
      background: isActive ? color + '22' : 'transparent',
      color: isActive ? color : '#3A3020',
      fontSize: '11px', fontWeight: '700',
      cursor: 'pointer', letterSpacing: '0.5px',
      fontFamily: 'DM Mono, monospace',
    }),
    actionBtn: (active) => ({
      padding: '6px 14px',
      borderRadius: '6px',
      border: '1px solid #1E1A14',
      background: active ? '#1A150A' : 'transparent',
      color: active ? '#4ADE80' : '#3A3020',
      fontSize: '11px', cursor: 'pointer',
      fontFamily: 'DM Mono, monospace',
    }),
    slideLabel: {
      padding: '12px 24px 8px',
      borderBottom: '1px solid #110F0A',
      display: 'flex', alignItems: 'center', gap: '12px',
    },
    slidePhaseBadge: (color) => ({
      padding: '4px 10px', borderRadius: '4px',
      background: color + '22',
      border: `1px solid ${color}33`,
      fontSize: '10px', fontWeight: '800',
      color, letterSpacing: '2px', textTransform: 'uppercase',
      fontFamily: 'DM Mono, monospace',
    }),
    outputArea: { flex: 1, overflowY: 'auto', padding: '16px 24px 40px' },
    promptBox: (color) => ({
      background: '#0C0A07',
      border: `1px solid #1A1510`,
      borderLeft: `3px solid ${color}`,
      borderRadius: '10px',
      padding: '22px',
      paddingTop: '44px',
      fontSize: '12px',
      lineHeight: '1.85',
      color: '#7A6A50',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
      margin: 0,
      position: 'relative',
    }),
    inlineCopyBtn: (active) => ({
      position: 'absolute', top: '10px', right: '10px',
      display: 'flex', alignItems: 'center', gap: '5px',
      padding: '5px 10px',
      background: active ? '#1A150A' : '#1A1510',
      border: `1px solid ${active ? '#4caf5066' : '#2A2010'}`,
      borderRadius: '6px',
      color: active ? '#4caf50' : '#3A3020',
      fontSize: '11px', fontFamily: 'DM Mono, monospace',
      fontWeight: '500', cursor: 'pointer', letterSpacing: '0.3px',
    }),
    navRow: { display: 'flex', justifyContent: 'space-between', marginTop: '14px' },
    navBtn: (disabled) => ({
      padding: '7px 16px', borderRadius: '6px',
      border: '1px solid #1A1510', background: 'transparent',
      color: disabled ? '#1E1A14' : '#3A3020',
      fontSize: '11px', cursor: disabled ? 'default' : 'pointer',
      fontFamily: 'DM Mono, monospace',
    }),
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={s.container}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300;1,400&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: #0C0A07; }
        ::-webkit-scrollbar-thumb { background: #1E1A14; border-radius: 3px; }
        select option { background: #110F0A; color: #C8B897; }
        textarea::placeholder, input::placeholder { color: #2A2218; }
      `}</style>

      {/* ── Header ── */}
      <div style={s.header}>
        <div style={s.headerLeft}>
          <div>
            <div style={s.pageTitle}>Carousel Prompt Generator</div>
            <div style={s.pageSubtitle}>HEIT Framework — 8-slide content system</div>
          </div>
          <div style={s.divider} />
          <div style={s.badge}>HEIT Framework</div>
        </div>

        <div style={{ display: 'flex', gap: '20px' }}>
          {Object.entries(PHASE_INFO).map(([letter, info]) => (
            <div key={letter} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{
                ...s.phaseBadge(info.color),
                width: '20px', height: '20px', borderRadius: '4px', fontSize: '10px',
              }}>
                {letter}
              </div>
              <span style={{ fontSize: '11px', color: '#3A3020', fontFamily: 'DM Mono, monospace' }}>{info.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ ...s.body, height: 'calc(100vh - 65px)' }}>

        {/* ── Left Panel ── */}
        <div style={s.leftPanel}>

          {/* Dropdowns */}
          {[
            { key: 'pillar',   label: 'Content Pillar',     options: PILLARS },
            { key: 'hookType', label: 'Hook Type',           options: HOOK_TYPES.map(h => h.label) },
            { key: 'ctaType',  label: 'CTA Type (Slide 8)', options: CTA_OPTIONS },
          ].map(({ key, label, options }) => (
            <div key={key} style={{ marginBottom: '16px' }}>
              <label style={s.fieldLabel}>{label}</label>
              <select
                value={form[key]}
                onChange={e => update(key, e.target.value)}
                style={s.select}
              >
                {options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              {key === 'hookType' && (
                <div style={s.hookExample}>
                  "{HOOK_TYPES.find(h => h.label === form.hookType)?.example}"
                </div>
              )}
            </div>
          ))}

          <div style={s.phaseDivider} />

          {/* Phase-grouped fields */}
          {['H', 'E', 'I', 'T'].map(phase => {
            const phaseFields = formFields.filter(f =>
              phase === 'H' ? (!f.phase || f.phase === 'H') : f.phase === phase
            );
            const info = PHASE_INFO[phase];

            return (
              <div key={phase} style={{ marginBottom: '20px' }}>
                <div style={{
                  ...s.phaseHeader,
                  borderBottom: `1px solid ${info.color}22`,
                }}>
                  <div style={s.phaseBadge(info.color)}>{phase}</div>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: info.color, letterSpacing: '1px', fontFamily: 'DM Mono, monospace' }}>
                      {info.label}
                    </div>
                    <div style={{ fontSize: '10px', color: '#3A3020', fontFamily: 'DM Mono, monospace' }}>
                      {info.slides} · {info.desc}
                    </div>
                  </div>
                </div>

                {phaseFields.map(({ key, label, placeholder, rows }) => (
                  <div key={key} style={{ marginBottom: '12px' }}>
                    <label style={s.fieldLabel}>{label}</label>
                    <textarea
                      value={form[key]}
                      onChange={e => update(key, e.target.value)}
                      placeholder={placeholder}
                      rows={rows}
                      style={s.textarea}
                    />
                  </div>
                ))}
              </div>
            );
          })}

          <button onClick={handleGenerate} style={s.generateBtn}>
            ✦ Generate 8 Slide Prompts
          </button>
        </div>

        {/* ── Right Panel ── */}
        <div style={s.rightPanel}>
          {!generated ? (
            <div style={s.emptyState}>
              <div style={s.emptyTitle}>H — E — I — T</div>
              <div style={{ fontSize: '14px', color: '#3A3020', marginBottom: '8px' }}>
                Fill in the left panel and generate your prompts.
              </div>
              <div style={{ fontSize: '12px', color: '#2A2218', maxWidth: '380px', lineHeight: '1.7', fontFamily: 'DM Mono, monospace' }}>
                Topic and hook line are the minimum. The conviction line on Slide 7 is the most important thing you'll write.
              </div>
              <div style={s.emptyCards}>
                {[
                  { letter: 'H', desc: 'Opens a loop. Reader feels seen.', color: PHASE_ACCENT.H },
                  { letter: 'E', desc: 'Names the real reason. Reframes.', color: PHASE_ACCENT.E },
                  { letter: 'I', desc: 'Story + proof. Makes it real.',    color: PHASE_ACCENT.I },
                  { letter: 'T', desc: 'Conviction. One clear next step.',  color: PHASE_ACCENT.T },
                ].map(({ letter, desc, color }) => (
                  <div key={letter} style={s.emptyCard(color)}>
                    <div style={{ fontSize: '18px', fontWeight: '800', color, marginBottom: '6px', fontFamily: 'DM Mono, monospace' }}>{letter}</div>
                    <div style={{ fontSize: '11px', color: '#3A3020', lineHeight: '1.4', fontFamily: 'DM Mono, monospace' }}>{desc}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Slide nav bar */}
              <div style={s.slideNav}>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {SLIDE_TYPES.map((slide, i) => {
                    const isActive = activeSlide === slide.id;
                    const color = PHASE_ACCENT[slide.phase];
                    return (
                      <button
                        key={slide.id}
                        onClick={() => setActiveSlide(slide.id)}
                        style={s.slideBtn(isActive, color)}
                      >
                        {i + 1}
                      </button>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={handleCopySlide} style={s.actionBtn(copiedSlide)}>
                    {copiedSlide ? '✓ Copied' : 'Copy Slide'}
                  </button>
                  <button onClick={handleCopy} style={s.actionBtn(copied)}>
                    {copied ? '✓ All Copied' : 'Copy All 8'}
                  </button>
                </div>
              </div>

              {/* Phase label bar */}
              <div style={s.slideLabel}>
                <div style={s.slidePhaseBadge(PHASE_ACCENT[activePhase])}>
                  {activeSlideData?.phaseLabel}
                </div>
                <div style={{ fontSize: '13px', color: '#4A4030', fontFamily: 'Sora, sans-serif' }}>
                  {activeSlideData?.label}
                </div>
                {activeSlide === 'explain2' && (
                  <div style={{ fontSize: '11px', color: '#F0A800', marginLeft: 'auto', fontFamily: 'DM Mono, monospace' }}>
                    ✦ Pivot slide — conviction line lives here
                  </div>
                )}
                {activeSlide === 'teach1' && (
                  <div style={{ fontSize: '11px', color: '#F0A800', marginLeft: 'auto', fontFamily: 'DM Mono, monospace' }}>
                    ✦ The save slide — write the conviction line last
                  </div>
                )}
              </div>

              {/* Prompt output */}
              <div style={s.outputArea}>
                <div style={{ position: 'relative' }}>
                  <pre style={s.promptBox(PHASE_ACCENT[activePhase])}>
                    {prompts[activeSlide]}
                  </pre>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(prompts[activeSlide]);
                      setCopiedInline(true);
                      setTimeout(() => setCopiedInline(false), 2000);
                    }}
                    style={s.inlineCopyBtn(copiedInline)}
                  >
                    {copiedInline ? '✓ Copied' : '⎘ Copy'}
                  </button>
                </div>

                {/* Prev / Next nav */}
                <div style={s.navRow}>
                  {['prev', 'next'].map(dir => {
                    const idx = SLIDE_TYPES.findIndex(s => s.id === activeSlide);
                    const targetIdx = dir === 'prev' ? idx - 1 : idx + 1;
                    const disabled = dir === 'prev' ? idx === 0 : idx === SLIDE_TYPES.length - 1;
                    return (
                      <button
                        key={dir}
                        onClick={() => !disabled && setActiveSlide(SLIDE_TYPES[targetIdx].id)}
                        disabled={disabled}
                        style={s.navBtn(disabled)}
                      >
                        {dir === 'prev' ? '← Previous' : 'Next →'}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
