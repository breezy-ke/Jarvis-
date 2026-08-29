# J.A.R.V.I.S. — Deployment Guide
> Brian's Personal AI Assistant · Digital Craft Consultancy

---

## 🚀 Deploy to Vercel in 5 Steps

### Step 1 — Get Your Anthropic API Key
1. Go to https://console.anthropic.com
2. Sign up / log in
3. Click **API Keys** → **Create Key**
4. Copy and save it somewhere safe

---

### Step 2 — Upload to GitHub
1. Go to https://github.com and sign in (or create free account)
2. Click **New Repository** → name it `jarvis-ai` → **Create**
3. Upload all files from this folder to the repo
   - Drag and drop works on GitHub.com
   - OR use GitHub Desktop app

---

### Step 3 — Deploy on Vercel
1. Go to https://vercel.com → Sign up with GitHub
2. Click **Add New Project**
3. Import your `jarvis-ai` repository
4. Click **Deploy** (Vercel auto-detects Next.js)

---

### Step 4 — Add Your API Key to Vercel
1. In your Vercel project → **Settings** → **Environment Variables**
2. Add:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** your key from Step 1
3. Click **Save**
4. Go to **Deployments** → click the 3 dots → **Redeploy**

---

### Step 5 — Add to Android Home Screen
1. Open Chrome on your Android phone
2. Go to your Vercel URL (e.g. `jarvis-ai.vercel.app`)
3. Tap the **⋮ menu** (top right)
4. Tap **"Add to Home Screen"**
5. Name it **JARVIS** → **Add**

✅ JARVIS now opens like a native app from your home screen!

---

## 🎙️ Voice Features
- **Mic button (🎙)** — tap to speak, Jarvis auto-sends when you stop
- **Voice Output toggle** — Jarvis speaks responses aloud
- Works best in **Chrome on Android**
- For best voice quality, use headphones

---

## 🔧 Local Development
```bash
npm install
cp .env.example .env.local
# Edit .env.local and add your API key
npm run dev
# Open http://localhost:3000
```

---

## 📁 Project Structure
```
jarvis-app/
├── app/
│   ├── layout.jsx        ← HTML shell + fonts
│   ├── page.jsx          ← Main Jarvis UI + voice
│   └── api/chat/
│       └── route.js      ← Secure API proxy (hides your key)
├── public/
│   └── manifest.json     ← PWA / home screen config
├── .env.example          ← Copy to .env.local
├── .gitignore
└── package.json
```

---

## 💡 Upgrading Jarvis

| Feature | What to do |
|---|---|
| Gmail access | Add Gmail MCP to api/chat/route.js |
| Calendar | Add Google Calendar MCP |
| Daily brief | Add a /brief route with web search |
| Custom voice | Integrate ElevenLabs API |
| Notifications | Add push notification service |

---

Built with ❤️ for Brian · Article 43 International · Digital Craft Consultancy
