import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { z } from "zod";

// npm runs workspace scripts with cwd set to the package, so the bare
// `dotenv/config` import would look for apps/brain/.env and silently find
// nothing. Resolve the repo-root .env explicitly instead — one file at the
// root is what the README promises.
const here = dirname(fileURLToPath(import.meta.url)); // src/ in dev, dist/ when built
loadEnv({ path: resolve(here, "../../../.env") });
// A package-local .env wins, for overriding a single value while developing.
loadEnv({ path: resolve(here, "../.env"), override: true });

/**
 * Environment, validated once at boot.
 *
 * A missing or malformed secret should stop the process immediately with a
 * message that says what to do — not surface later as a confusing 500 on the
 * phone, halfway through a sentence.
 */

const base64Key32 = z
  .string()
  .min(1, "required")
  .refine((v) => Buffer.from(v, "base64").length === 32, {
    message:
      'must be 32 bytes of base64 — generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"',
  });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  PUBLIC_BASE_URL: z.string().url().default("http://localhost:3000"),

  /** IANA timezone Jarvis reasons in when nothing else is specified. */
  TIMEZONE: z.string().default("Africa/Nairobi"),

  ANTHROPIC_API_KEY: z.string().min(1, "required — get one at https://console.anthropic.com"),
  DATABASE_URL: z.string().min(1, "required — Supabase → Settings → Database → Connection string"),

  ENCRYPTION_KEY: base64Key32,
  DEVICE_BOOTSTRAP_SECRET: z.string().min(16, "must be at least 16 characters"),

  // Phase 2 — absent until Google is wired up.
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
});

function load() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    console.error(
      `\nCannot start — the environment is incomplete:\n\n${problems}\n\n` +
        `Copy .env.example to .env and fill in the blanks.\n`,
    );
    process.exit(1);
  }

  return parsed.data;
}

export const config = load();

export const isProduction = config.NODE_ENV === "production";

/** True once Google credentials exist, gating the Phase 2 tools. */
export const googleConfigured = Boolean(config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET);
