# Project Context — for Nightly Planner Agent

> This file gives the nightly-planner workflow the background it needs to
> update TODO.md and write a useful nightly plan. Keep this file current.
> The planner reads it every night at 2 AM UTC.

---

## What This Project Is

**Content Command Center OS** — a full-stack SaaS for solo content creators.
It replaces scattered tools (Notion, spreadsheets, Buffer) with one system:
strategy → production → scheduling → analytics, all in one place.

Built and maintained by **Levi Acay**.

---

## Current Project State

- **Status:** Live in production on Railway
- **URL:** https://ccc-os-production.up.railway.app
- **Stage:** Early product — feature complete for v1, now refining and stabilizing

### What's Working
- Full auth system (email/password + Google OAuth)
- Brand + pillar strategy layer
- Production pipeline (kanban-style asset management)
- Multi-platform OAuth connections (YouTube, Instagram, Facebook, TikTok, Twitter, Threads, LinkedIn, Pinterest)
- Post scheduling with cron jobs
- Content repurposing rules engine
- Distribution funnels + CTA route management
- Analytics + weekly review system
- SettingsRoom (profile, notifications, platforms, billing placeholder, danger zone)

### What's In Progress / Broken
- Billing tab is a placeholder — no Stripe integration yet
- YouTube upload progress UI is missing
- Scheduler error handling needs improvement
- No onboarding flow for new users

---

## Immediate Priorities (this week)

1. Stabilize publish loop error handling
2. Get billing tab wired to Stripe
3. Improve new user experience (onboarding)

---

## Tech Reminders for the Planner

- Frontend: React + Vite, all in `client/src/App.jsx` (monolithic, ~3900 lines)
- Backend: Express + SQLite, routes in `server/routes/`
- Do NOT suggest breaking App.jsx into components yet — deferred intentionally
- Zustand stores are in `client/src/lib/store/` (TypeScript)
- Push command uses personal access token (stored in MEMORY.md, not here)

---

## Content Pipeline Context

- Content agent runs daily at 9 AM UTC to generate a YouTube script draft
- Levi reviews and edits before filming
- `content-notes.md` is the daily brief — update it with the next topic after filming

---

## Notes for the Planner

- Keep TODO.md tight — max ~10 open items across P0/P1/P2 combined
- If a P2 item has been sitting for 2+ runs without progress, flag it in the nightly report
- Nightly report should be short: 3–5 bullets, not a wall of text
- Focus on what changed, what's blocked, and what to prioritize tomorrow
