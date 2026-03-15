# TODO — Content Command Center OS

> Managed by the nightly-planner workflow. Updated each night automatically.
> Manually add items anytime — the planner will reorganize on next run.

---

## P0 — Critical / In Progress

- [ ] Verify Railway deployment is healthy after latest push
- [ ] Test Meta (Instagram) publish flow end-to-end in production

## P1 — High Priority

- [ ] Add rate-limit error handling to the scheduler publish loop
- [ ] Build out SettingsRoom > Billing tab (currently placeholder)
- [ ] Add YouTube video upload progress indicator to SchedulerRoom UI

## P2 — Backlog

- [ ] Migrate SQLite → PostgreSQL (when ready to scale)
- [ ] Add email notification when scheduled post fails to publish
- [ ] Write onboarding flow for new users (first brand setup wizard)
- [ ] Add platform analytics sync (pull real follower counts into platform_stats)
- [ ] Explore TikTok auto-publish API approval process

---

## Completed

- [x] Google OAuth sign-in flow
- [x] Sidebar user identity block (avatar + name + email)
- [x] SettingsRoom 5-tab layout (Profile, Notifications, Platforms, Billing, Danger Zone)
- [x] PipelineBoard drag-and-drop with Zustand content store
- [x] Instagram publishing via Facebook Login + Graph API
- [x] Facebook chunked video upload (3-phase)
- [x] OAuth popup flow for all platforms
