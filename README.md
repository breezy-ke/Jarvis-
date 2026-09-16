# J.A.R.V.I.S.

> Brian's personal AI assistant · Digital Craft Consultancy

A Next.js 14 progressive web app with a voice-driven chat interface, backed by
Claude through a server-side proxy so the API key never reaches the browser.

---

## Deploy to Vercel

The app needs a server for `/api/chat`, so it runs on Vercel (or any Node host).
A static export will not work — the API route is what keeps the key secret.

1. **Get an API key** at [console.anthropic.com](https://console.anthropic.com)
   → **API Keys** → **Create Key**.
2. **Push this repo to GitHub**, then at [vercel.com](https://vercel.com) →
   **Add New Project** → import it. Vercel detects Next.js on its own.
3. **Add the key** under **Settings → Environment Variables**:
   `ANTHROPIC_API_KEY` = your key. Then **Deployments → ⋯ → Redeploy**.
4. **Add to your home screen**: open the Vercel URL in Chrome on Android →
   **⋮** → **Add to Home Screen** → name it **JARVIS**.

Without the key set, the app loads and answers every message with
"Jarvis is missing its API key" rather than failing silently.

---

## Local development

```bash
npm install
cp .env.example .env.local     # then add your key
npm run dev                    # http://localhost:3000
```

```bash
npm test          # message-handling tests
npm run build     # production build
```

---

## Voice

- **🎙 mic button** — tap to speak; Jarvis sends automatically when you stop.
- **Voice output toggle** — Jarvis reads replies aloud.
- Both use the browser's built-in Web Speech API, so they work best in Chrome
  on Android. Safari and Firefox support is partial.

---

## Configuration

| Variable | Required | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | yes | Server-side key for the Claude API |
| `JARVIS_EFFORT` | no | `low`, `medium` (default), `high`, `xhigh`, or `max` |

`JARVIS_EFFORT` trades latency and cost against depth. `medium` keeps voice
replies quick; raise it to `high` for research and drafting.

The model is `claude-opus-5`, set in `app/api/chat/route.js`. It is the most
capable option and priced accordingly — switch the `MODEL` constant to
`claude-sonnet-5` for roughly half the cost per token if daily briefs don't
need the extra depth.

---

## A note on access

`/api/chat` is public once deployed. Anyone who learns the URL can send requests
that bill to your key. Per-request size and turn limits are enforced in
`lib/messages.mjs`, but there is no authentication. If you share the URL or it
gets indexed, add access control or rotate the key.

---

## Project structure

```
app/
  layout.jsx            HTML shell, fonts, PWA metadata
  page.jsx              Chat UI, voice input and output
  api/chat/route.js     Server-side Claude proxy — keeps the key secret
lib/
  messages.mjs          Transcript normalisation and reply extraction
test/
  messages.test.mjs     Tests for the above
public/
  manifest.json         PWA / home screen config
  icon-*.png            Generated app icons
```

---

Built for Brian · Article 43 International · Digital Craft Consultancy
