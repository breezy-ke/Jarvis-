import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { config } from "./config.js";

/**
 * Symmetric encryption for anything that grants access to Brian's accounts —
 * chiefly OAuth refresh tokens, which are long-lived and worth more than the
 * access tokens they mint.
 *
 * AES-256-GCM: authenticated, so tampering fails loudly instead of decrypting
 * to garbage.
 */

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12; // 96 bits, the GCM standard
const KEY = Buffer.from(config.ENCRYPTION_KEY, "base64");

/** Encrypt to a self-describing `v1.iv.tag.ciphertext` string, all base64url. */
export function encrypt(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);

  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    "v1",
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

/**
 * Reverse of `encrypt`. Throws on a wrong key, a corrupted payload, or any
 * tampering — callers should treat a throw as "this account needs reconnecting"
 * rather than retrying.
 */
export function decrypt(payload: string): string {
  const parts = payload.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") {
    throw new Error("Malformed ciphertext");
  }

  const [, ivPart, tagPart, dataPart] = parts as [string, string, string, string];
  const decipher = createDecipheriv(ALGORITHM, KEY, Buffer.from(ivPart, "base64url"));
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(dataPart, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

/* ─── Device tokens ────────────────────────────────────────────────────── */

/** A fresh device token. Returned to the client once and never stored raw. */
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Hash a device token for storage.
 *
 * Plain SHA-256 rather than bcrypt/argon2 on purpose: these are 256 bits of
 * machine-generated entropy, not user-chosen passwords, so there is no
 * dictionary to slow down — and this runs on every single request.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Constant-time comparison, so failures leak no timing information. */
export function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}
