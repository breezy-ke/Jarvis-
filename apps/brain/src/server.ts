import { randomUUID } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import {
  approvalRequestSchema,
  encodeSSE,
  registerDeviceRequestSchema,
  turnRequestSchema,
  type ServerEvent,
} from "@jarvis/shared";
import Fastify from "fastify";
import { ensureConversation, runTurn } from "./agent.js";
import { approvals } from "./approvals.js";
import { AuthError, authenticate, registerDevice } from "./auth.js";
import { config, isProduction } from "./config.js";
import { closeDb } from "./db/index.js";

const app = Fastify({
  logger: {
    level: isProduction ? "info" : "debug",
    // Never let a token or an authorization header reach the logs.
    redact: ["req.headers.authorization", "body.bootstrapSecret", "body.token"],
  },
});

/** Keeps proxies from closing an idle SSE stream while a human reads a card. */
const HEARTBEAT_MS = 15_000;

/* ─── Health ───────────────────────────────────────────────────────────── */

app.get("/health", async () => ({ ok: true, service: "jarvis-brain" }));

/* ─── Device registration ──────────────────────────────────────────────── */

app.post("/devices/register", async (request, reply) => {
  const parsed = registerDeviceRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: "Invalid request", issues: parsed.error.issues });
  }

  try {
    return await registerDevice(parsed.data);
  } catch (error) {
    if (error instanceof AuthError) {
      return reply.status(401).send({ error: error.message });
    }
    throw error;
  }
});

/* ─── Turn (SSE) ───────────────────────────────────────────────────────── */

app.post("/turn", async (request, reply) => {
  try {
    await authenticate(request);
  } catch (error) {
    if (error instanceof AuthError) {
      return reply.status(401).send({ error: error.message });
    }
    throw error;
  }

  const parsed = turnRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: "Invalid request", issues: parsed.error.issues });
  }

  const { text, mode } = parsed.data;
  const conversationId = await ensureConversation(parsed.data.conversationId);
  const turnId = randomUUID();

  // Take over the socket — Fastify stops managing the response from here.
  reply.hijack();
  reply.raw.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    // Disables buffering in nginx-style proxies, which would otherwise hold
    // events back until the turn finished — defeating the point of streaming.
    "X-Accel-Buffering": "no",
  });

  let open = true;
  const emit = (event: ServerEvent): void => {
    if (!open) return;
    reply.raw.write(encodeSSE(event));
  };

  const heartbeat = setInterval(() => {
    if (open) reply.raw.write(": ping\n\n");
  }, HEARTBEAT_MS);

  // If the phone goes away mid-approval, deny what is pending rather than
  // executing a write with nobody watching.
  request.raw.on("close", () => {
    open = false;
    clearInterval(heartbeat);
    approvals.cancelTurn(turnId);
  });

  emit({ type: "turn_started", turnId, conversationId });

  try {
    const { stopReason, usage } = await runTurn({ turnId, conversationId, text, mode, emit });
    emit({ type: "turn_finished", turnId, stopReason, usage });
  } catch (error) {
    app.log.error({ err: error, turnId }, "turn failed");
    emit({ type: "error", ...describeError(error) });
  } finally {
    clearInterval(heartbeat);
    approvals.cancelTurn(turnId);
    if (open) reply.raw.end();
    open = false;
  }
});

/* ─── Approvals ────────────────────────────────────────────────────────── */

app.post<{ Params: { turnId: string } }>("/turns/:turnId/approve", async (request, reply) => {
  try {
    await authenticate(request);
  } catch (error) {
    if (error instanceof AuthError) {
      return reply.status(401).send({ error: error.message });
    }
    throw error;
  }

  const parsed = approvalRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: "Invalid request", issues: parsed.error.issues });
  }

  const delivered = approvals.resolve({
    turnId: request.params.turnId,
    toolUseId: parsed.data.toolUseId,
    decision: parsed.data.decision,
    ...(parsed.data.note !== undefined ? { note: parsed.data.note } : {}),
  });

  if (!delivered) {
    // Already answered, already timed out, or from a different turn. Not an
    // error worth alarming the client about — just nothing left to decide.
    return reply.status(409).send({ error: "No pending approval with that id" });
  }

  return { ok: true };
});

/* ─── Errors ───────────────────────────────────────────────────────────── */

function describeError(error: unknown): { message: string; code: ServerEventCode } {
  // Most specific first — collapsing these loses the retryable/not distinction.
  if (error instanceof Anthropic.RateLimitError) {
    return { message: "Rate limited by the API. Try again shortly.", code: "rate_limited" };
  }
  if (error instanceof Anthropic.AuthenticationError) {
    return { message: "The Anthropic API key was rejected.", code: "unauthorized" };
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return { message: "Could not reach the Anthropic API.", code: "upstream" };
  }
  if (error instanceof Anthropic.APIError) {
    return { message: `Upstream error: ${error.message}`, code: "upstream" };
  }
  return {
    message: error instanceof Error ? error.message : "Something went wrong.",
    code: "internal",
  };
}

type ServerEventCode = NonNullable<Extract<ServerEvent, { type: "error" }>["code"]>;

/* ─── Lifecycle ────────────────────────────────────────────────────────── */

async function shutdown(signal: string): Promise<void> {
  app.log.info(`${signal} received, shutting down`);
  await app.close();
  await closeDb();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

try {
  await app.listen({ port: config.PORT, host: "0.0.0.0" });
  app.log.info(`Jarvis brain listening on ${config.PUBLIC_BASE_URL}`);
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
