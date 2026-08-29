import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { config } from "../config.js";
import * as schema from "./schema.js";

/**
 * Supabase's pooled connection string runs in transaction mode, which does not
 * support prepared statements. `prepare: false` is what keeps that from
 * failing intermittently under load rather than immediately at boot.
 */
const client = postgres(config.DATABASE_URL, {
  prepare: false,
  max: 10,
  idle_timeout: 20,
});

export const db = drizzle(client, { schema });

export { schema };

/** Close the pool on shutdown so in-flight queries finish first. */
export async function closeDb(): Promise<void> {
  await client.end({ timeout: 5 });
}
