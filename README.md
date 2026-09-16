# J.A.R.V.I.S. — Brian's Personal AI Assistant
> Digital Craft Consultancy · Article 43 International

A voice-capable personal assistant built on Next.js and the Claude API, installable
to an Android home screen as a PWA.

There are two supported ways to deploy it. Both keep your Anthropic API key on the
server — the key is never shipped to the browser.

| | Cloudflare Pages | Vercel |
|---|---|---|
| Deploy by | uploading a zip | connecting the repo |
| Chat endpoint runs as | `_worker.js` at the edge | Next.js route handler |
| Build command | `npm run build:cloudflare` | `npm run build` |
| Where the key lives | Pages environment variable | Project environment variable |

---

## Get an API key first

1. Go to https://console.anthropic.com
2. **API Keys → Create Key**
3. Copy it somewhere safe — you will paste it into your host's settings, never into the code.

---

## Deploy A — Cloudflare Pages (zip upload)

```bash
npm install
npm run build:cloudflare      # produces jarvis-cloudflare.zip
```

1. Cloudflare dashboard → **Workers & Pages → Create → Pages → Upload assets**
2. Drop `jarvis-cloudflare.zip` in and deploy.
3. **Settings → Environment variables** → add `ANTHROPIC_API_KEY` with your key.
4. **Redeploy** so the new variable is picked up.

> The variable must be set or chat will answer with "No API key configured on the
> server." The UI itself still loads without it.

### Why there is a `_worker.js`

Cloudflare Pages direct upload serves static files, so a Next.js route handler
cannot run there. The only way to keep chat working *without* putting the
Anthropic key in the browser bundle is a small edge worker, so the build emits
one. `worker/index.js` handles `/api/chat` and passes everything else through to
the static export.

`out/_routes.json` limits the worker to `/api/*`, so the rest of the site is
served straight from Cloudflare's CDN.

---

## Deploy B — Vercel (git)

1. Push this repo to GitHub.
2. https://vercel.com → **Add New Project** → import the repo → **Deploy**.
3. **Settings → Environment Variables** → add `ANTHROPIC_API_KEY`.
4. **Deployments → ⋯ → Redeploy**.

No build flags needed — `app/api/chat/route.js` runs as a normal route handler.

---

## Add to your Android home screen

1. Open the deployed URL in Chrome.
2. **⋮ menu → Add to Home Screen** → name it **JARVIS**.

It then opens fullscreen like a native app, using the icons in `public/`.

---

## Local development

```bash
npm install
cp .env.example .env.local     # then paste your key into .env.local
npm run dev                    # http://localhost:3000
```

---

## Voice

- **🎙 button** — tap to speak; Jarvis auto-sends when you stop.
- **Voice Output toggle** — Jarvis speaks replies aloud.
- Works best in Chrome on Android. Headphones improve recognition.

---

## Project layout

```
app/
  layout.jsx            HTML shell, fonts, PWA metadata
  page.jsx              Jarvis UI + speech recognition/synthesis
  api/chat/route.js     Chat endpoint for the server build (Vercel)
lib/
  chat.js               Shared chat logic — the single source of truth for
                        both deploy targets
worker/
  index.js              Cloudflare Pages edge worker (bundled to _worker.js)
scripts/
  build-cloudflare.mjs  Static export + worker bundle + zip
  generate-icons.mjs    Regenerates the PWA icons
  verify-build.mjs      Serves the built bundle and asserts on it
public/
  manifest.json         PWA config
  icon-192.png          Generated — do not edit by hand
  icon-512.png          Generated — do not edit by hand
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` | Server build (Vercel) |
| `npm run build:cloudflare` | Static export + worker → `jarvis-cloudflare.zip` |
| `npm run verify` | Serves the built bundle and runs 16 checks against it |
| `npm run icons` | Regenerates `public/icon-*.png` |

Run `npm run verify` after `npm run build:cloudflare` — it exercises the actual
bundled worker, not the source it came from.

## Tuning Jarvis

The model settings live at the top of `lib/chat.js`, so changing them affects both
deploy targets at once:

| Constant | Default | Raise it when |
|---|---|---|
| `MODEL` | `claude-opus-5` | — |
| `MAX_TOKENS` | `4096` | daily briefs start getting cut off |
| `EFFORT` | `medium` | research answers feel shallow (`high`/`xhigh`) |

`SYSTEM_PROMPT` in the same file defines Jarvis's personality and capabilities.

## Known issue: Next.js security advisory

`npm audit` reports a critical advisory (RCE in the Image Optimization API via
AVIF, `GHSA-2xp9-vwfh-vxw4`). The advisory covers **every** Next.js 14 and 15
release — the first patched version is 16.x, which is a major upgrade.

This repo pins the newest 14.x (`14.2.35`). The Cloudflare build is not exposed:
it is a static export with image optimization disabled, so the vulnerable endpoint
does not exist in the deployed output. **A Vercel deployment does run that
endpoint** and is exposed, even though this app never uses `next/image`.

Upgrading to Next 16 is the fix, and is worth doing before relying on the Vercel
path.

---

Built for Brian · Article 43 International · Digital Craft Consultancy
