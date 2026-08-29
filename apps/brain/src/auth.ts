import type { RegisterDeviceRequest, RegisterDeviceResponse } from "@jarvis/shared";
import { eq } from "drizzle-orm";
import type { FastifyRequest } from "fastify";
import { config } from "./config.js";
import { generateToken, hashToken, safeEqual } from "./crypto.js";
import { db } from "./db/index.js";
import { devices, type Device } from "./db/schema.js";

/**
 * Device-token auth.
 *
 * Single user, so there is no account system — just a list of devices Brian has
 * explicitly trusted. Revoking a row is the kill switch: it cuts that device off
 * from every connected account at once.
 */

export class AuthError extends Error {
  readonly statusCode = 401;
}

/**
 * Trade the bootstrap secret for a long-lived device token.
 *
 * The raw token is returned exactly once and never stored — only its hash — so
 * a database leak does not hand over live access.
 */
export async function registerDevice(
  input: RegisterDeviceRequest,
): Promise<RegisterDeviceResponse> {
  if (!safeEqual(input.bootstrapSecret, config.DEVICE_BOOTSTRAP_SECRET)) {
    throw new AuthError("Invalid bootstrap secret");
  }

  const token = generateToken();

  const [created] = await db
    .insert(devices)
    .values({
      name: input.name,
      platform: input.platform,
      tokenHash: hashToken(token),
    })
    .returning({ id: devices.id });

  if (!created) throw new Error("Could not register device");

  return { deviceId: created.id, token };
}

/**
 * Resolve the caller from its `Authorization: Bearer` token.
 *
 * Throws on anything unrecognized or revoked. The lookup is by hash, so the
 * raw token never has to be compared against stored material.
 */
export async function authenticate(request: FastifyRequest): Promise<Device> {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new AuthError("Missing bearer token");
  }

  const token = header.slice("Bearer ".length).trim();
  if (!token) throw new AuthError("Empty bearer token");

  const [device] = await db
    .select()
    .from(devices)
    .where(eq(devices.tokenHash, hashToken(token)))
    .limit(1);

  if (!device) throw new AuthError("Unknown device token");
  if (device.revokedAt) throw new AuthError("This device has been revoked");

  // Fire-and-forget: a last-seen update should never delay or fail a request.
  void db
    .update(devices)
    .set({ lastSeenAt: new Date() })
    .where(eq(devices.id, device.id))
    .catch(() => {});

  return device;
}
