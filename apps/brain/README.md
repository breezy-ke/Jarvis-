# Jarvis — the brain

The headless agent service. Claude Opus 5 with a tool-calling loop, persistent memory, an
approval gate on anything that writes, and an audit log of everything it does.

No UI. The phone is a client of this, not the other way round.

## Run it

```bash
npm install
cp .env.example .env         # fill in ANTHROPIC_API_KEY and DATABASE_URL
npm run db:push              # create tables
npm run dev                  # listening on :3000
```

## Prove it works, without a phone

Register this machine as a device:

```bash
SECRET=$(grep DEVICE_BOOTSTRAP_SECRET .env | cut -d= -f2)

TOKEN=$(curl -s -X POST localhost:3000/devices/register \
  -H 'Content-Type: application/json' \
  -d "{\"bootstrapSecret\":\"$SECRET\",\"name\":\"laptop\",\"platform\":\"cli\"}" \
  | node -pe "JSON.parse(require('fs').readFileSync(0,'utf8')).token")
```

The token is shown once. Only its SHA-256 hash is stored, so a database dump does not hand
anyone live access.

Now take a turn. This one deliberately triggers both paths — a read that runs silently and a
write that stops for you:

```bash
curl -N -X POST localhost:3000/turn \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"text":"what time is it? and remind me to send Amina the proposal on Thursday","mode":"text"}'
```

You should see, in order: `turn_started`, streamed `text`, a `tool_started` for `get_time`
running on its own, then an `approval_required` that stops everything. Nothing is written yet.

Approve it from another terminal, using the `turnId` and `toolUseId` from the stream:

```bash
curl -X POST localhost:3000/turns/<turnId>/approve \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"toolUseId":"<toolUseId>","decision":"approve"}'
```

The parked turn resumes and finishes. Swap `"approve"` for `"deny"` and Claude will acknowledge
the refusal and carry on without the task — it will not look for another way to do it.

Check what actually happened:

```sql
SELECT tool_name, risk, decision, ok, result_summary FROM audit_log ORDER BY created_at;
```

## Tests

```bash
npm test
```

Covers the safety property that matters: a write cannot execute unless a human approved it —
including when the approval comes from a stale turn, and when the client disconnects mid-decision.
Needs `DATABASE_URL`; no API key and no tokens spent.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Liveness |
| `POST` | `/devices/register` | Trade the bootstrap secret for a device token |
| `POST` | `/turn` | Take a turn; responds as an SSE stream |
| `POST` | `/turns/:turnId/approve` | Answer a pending approval |

Everything but `/health` and `/devices/register` needs `Authorization: Bearer <device token>`.

## Layout

| File | Role |
|---|---|
| `src/agent.ts` | The Opus 5 tool-runner loop, caching, streaming |
| `src/prompt.ts` | Standing instructions — byte-stable, it is the cached prefix |
| `src/tools/registry.ts` | Risk levels, the approval envelope, audit writes |
| `src/tools/builtin.ts` | Tools needing no connected account |
| `src/approvals.ts` | The parked-promise gate |
| `src/auth.ts` | Device tokens |
| `src/db/schema.ts` | Drizzle schema |

## Adding a tool

```ts
defineTool({
  name: "send_invoice",
  description: "…written for Claude: when to use it, and when not to",
  risk: "write",                  // read | write | destructive
  inputSchema: z.object({ … }),
  preview: (input) => ({ summary: "Send invoice to Acme", detail: input.body }),
  execute: async (input, ctx) => ({ summary: "Sent", content: "Invoice sent." }),
});
```

Register it in `src/tools/index.ts`. The risk level is the only thing deciding whether it stops
for approval — there is no separate wiring to forget, which is the point.

`preview` is what Brian actually reads before approving, so make it say what will really happen.
`summary` goes to the HUD and the audit log; `content` is what Claude gets back.

## Notes

- The turn's HTTP connection stays open while an approval is pending, which is why this runs as
  a persistent process rather than a serverless function.
- Nothing time-varying may enter `SYSTEM_PROMPT` — it is the cached prefix, and a timestamp in
  it means paying full price on every request. Per-turn context goes in the message instead.
- Watch `cache_read_input_tokens` in the `turn_finished` usage. A persistent zero means
  something volatile has crept into the prefix.
