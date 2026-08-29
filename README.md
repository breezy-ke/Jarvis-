# J.A.R.V.I.S.

A personal AI assistant: voice-driven, Claude-powered, connected to real accounts, built to
plan and execute work rather than just talk about it.

## Structure

```
apps/
  brain/       headless agent service — Fastify + Claude Opus 5 tool loop   (deploy: Railway)
  mobile/      Android app — voice in, voice out, approval cards            (build: EAS)
packages/
  shared/      wire types shared by brain and mobile
  tools/       tool registry + account adapters (Google, Slack)
reference/
  jarvis-web/  the original PWA prototype, kept as HUD design source — not built
```

The brain is headless on purpose. The phone is *a* client, not *the* app, so a desktop client
or a second device is additive rather than a rewrite.

## The trust ladder

Every tool declares a risk level, and that decides what happens when Claude calls it:

| Risk | Behaviour |
|---|---|
| `read` | Runs silently — list events, search inbox, read a doc |
| `write` | Preview → you approve → executes — send email, book meeting |
| `destructive` | Always confirms with a full preview — delete, cancel, spend |

Every call, approved or denied or auto-run, lands in `audit_log`. Nothing it does is invisible.

## Getting started

```bash
npm install
cp .env.example .env      # fill in ANTHROPIC_API_KEY and DATABASE_URL
npm run db:push           # create tables
npm run dev               # brain on :3000
```

Then register a device and talk to it — see `apps/brain/README.md`.

## Status

Phase 1 — the brain runs, holds memory, calls tools, and stops for approval before any write.
Google account tools land in Phase 2, the Android app in Phase 3. Full plan and phasing live in
the project plan.
