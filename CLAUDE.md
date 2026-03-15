# Content Command Center OS — Claude Instructions

## Project Overview

**Content Command Center OS** is a full-stack SaaS for content creators.
It turns any social media account into a systematized content business.

- **Stack:** React 18 + Vite (frontend) · Node.js + Express (API) · SQLite (database)
- **Deploy:** Railway — https://ccc-os-production.up.railway.app
- **Repo:** github.com/wealthsocietyedu/ccc-os (main branch)

---

## Content Voice & Brand Rules

- **Tone:** Direct, confident, no fluff. Speak to creators who treat content as a business.
- **Creator persona:** Levi Acay — content systems educator, operator mindset.
- **Audience:** Solo creators, coaches, and educators monetizing through social media.
- **Avoid:** Buzzword stacking, vague inspiration, filler phrases like "in today's world".
- **Prefer:** Specific numbers, contrarian angles, system-thinking framing, outcome-first hooks.

---

## Content Output Standards

### YouTube Scripts
- Length: 800–1200 words (8–12 min video)
- Structure: Hook (0–30s) → Problem/Stakes → Core Framework → Examples → CTA
- Hook must be the first line — make it a pattern interrupt or bold claim
- Use conversational language, short paragraphs, no walls of text
- End with a single clear CTA (subscribe, comment, or linked resource)

### Hooks (5 options)
- Each hook must be a standalone sentence under 20 words
- Formats to cycle through: Bold claim · Question · Contrarian · Story open · Stat
- No two hooks should use the same format

### Titles (5 options)
- Under 65 characters each
- At least one must be a number-led title (e.g. "5 Systems That…")
- At least one must use a power word (Hidden, Broken, Steal, Dead, etc.)
- No clickbait that the video can't deliver on

---

## File Conventions

- All generated content → `content-output/`
- Daily script → `content-output/daily-script.md`
- Nightly plan → `reports/nightly-plan.md`
- TODO tracking → `TODO.md` (project root)
- Source notes for content agent → `content-notes.md`
- Context for planner agent → `docs/context.md`

---

## Workflow Behaviour

### content-agent
1. Read `content-notes.md` for the topic, angle, and any raw notes
2. Generate: one YouTube script + 5 hooks + 5 titles
3. Write everything to `content-output/daily-script.md`
4. Overwrite the file each run — this is a daily draft, not an archive

### nightly-planner
1. Read `docs/context.md` for project state, priorities, and open threads
2. Update `TODO.md` — add new items, mark done items complete
3. Write a short nightly summary to `reports/nightly-plan.md`
4. Keep `TODO.md` clean: group by priority (P0 / P1 / P2), remove completed items

---

## Code Rules (when Claude modifies source files)

- Frontend: JSX only (no TypeScript for `.jsx` files)
- Zustand stores live in `client/src/lib/store/` — TypeScript
- API helpers live in `client/src/lib/api.js` — all routes use relative `/api` prefix
- Never touch `server/.env` — read `.env.example` for variable reference
- Test locally with `npm run dev` from repo root before committing
