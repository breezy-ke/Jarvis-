import { z } from "zod";

/** Consent wording version. Bump whenever the text on the form changes —
 *  the stored value is what proves what a person actually agreed to. */
export const CONSENT_VERSION = "2026-07-v1";

/**
 * Kenyan mobile numbers, normalised to E.164.
 *
 * Accepts every shape people actually type: 0712345678, 712345678,
 * +254712345678, 254 712 345 678, with or without spaces and dashes.
 * Returns null if it is not a plausible Kenyan mobile.
 *
 * Normalising on the way in is what makes the unique-phone constraint work.
 * Without it the same person registers three times in three formats and the
 * register quietly inflates.
 */
export function normalizeKenyanPhone(input: string): string | null {
  const digits = String(input ?? "").replace(/[^\d+]/g, "");
  let rest: string;

  if (digits.startsWith("+254")) rest = digits.slice(4);
  else if (digits.startsWith("254")) rest = digits.slice(3);
  else if (digits.startsWith("0")) rest = digits.slice(1);
  else rest = digits;

  // Safaricom/Airtel/Telkom mobile ranges are 9 digits starting 7 or 1.
  if (!/^[17]\d{8}$/.test(rest)) return null;
  return `+254${rest}`;
}

/** Display form for confirmation screens: +254 712 345 678 */
export function formatPhoneForDisplay(e164: string): string {
  const m = /^\+254(\d{3})(\d{3})(\d{3})$/.exec(e164);
  return m ? `+254 ${m[1]} ${m[2]} ${m[3]}` : e164;
}

/** Mask for anywhere a number is shown to staff who do not need it in full. */
export function maskPhone(e164: string): string {
  const m = /^\+254(\d{3})(\d{3})(\d{3})$/.exec(e164);
  return m ? `+254 ${m[1]} ••• ${m[3].slice(-3)}` : "•••";
}

const phoneSchema = z
  .string()
  .transform((v) => normalizeKenyanPhone(v))
  .refine((v): v is string => v !== null, {
    message: "Enter a Kenyan mobile number, for example 0712 345 678.",
  });

export const registrationSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, "Enter your full name as it appears on your voter's card.")
    .max(120, "That name is too long for the register.")
    .refine((v) => v.split(/\s+/).length >= 2, {
      message: "Include at least a first and a last name.",
    }),

  phone: phoneSchema,

  nationalIdLast4: z
    .string()
    .trim()
    .regex(/^\d{4}$/, "Enter the last four digits of your ID.")
    .optional()
    .or(z.literal("").transform(() => undefined)),

  gender: z.enum(["female", "male", "other", "undisclosed"]).default("undisclosed"),

  yearOfBirth: z.coerce
    .number()
    .int()
    .min(1920)
    .max(new Date().getFullYear() - 17, "You must be a registered voter to join.")
    .optional(),

  wardId: z.coerce.number().int().positive("Choose your ward."),
  pollingStationId: z.coerce.number().int().positive("Choose your polling station."),
  // Optional: administrative sub-locations (chief's areas) are not in the
  // electoral data, so a supporter is never required to pick one.
  subLocationId: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z.number().int().positive().optional(),
  ),

  village: z.string().trim().max(80).optional().or(z.literal("").transform(() => undefined)),

  // Consent to be on the register is required; SMS consent is genuinely optional.
  // These are separate purposes under the Data Protection Act 2019 and are
  // never bundled into a single checkbox.
  consentRegister: z.literal(true, {
    message: "We cannot add you to the register without your permission.",
  }),
  consentSms: z.boolean().default(false),

  referralCode: z.string().trim().max(24).optional().or(z.literal("").transform(() => undefined)),

  // Supporter insight. Every one of these is optional on purpose: somebody who
  // only wants to be counted must never be blocked from being counted.
  topIssue: z
    .enum(["jobs", "education", "oversight", "water", "security", "health", "livestock", "other"])
    .optional()
    .or(z.literal("").transform(() => undefined)),
  secondIssue: z
    .enum(["jobs", "education", "oversight", "water", "security", "health", "livestock", "other"])
    .optional()
    .or(z.literal("").transform(() => undefined)),
  pledge: z
    .enum(["vote_only", "spread_word", "attend_events", "volunteer"])
    .optional()
    .or(z.literal("").transform(() => undefined)),
  heardVia: z
    .enum(["friend_family", "baraza", "social_media", "whatsapp", "radio", "agent", "other"])
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export type RegistrationInput = z.input<typeof registrationSchema>;
export type RegistrationData = z.output<typeof registrationSchema>;

export const otpSchema = z.object({
  supporterId: z.string().uuid(),
  code: z.string().trim().regex(/^\d{6}$/, "Enter the six digit code."),
});

/**
 * Referral codes are shown to people, read aloud, and typed back in, so no two
 * characters in this set can be confused with each other.
 *
 * Dropped entirely because neither member of the pair is clearly safer:
 *   0/O, 1/I/L, 5/S
 * Digit kept, confusable letter dropped:
 *   8 (no B), 2 (no Z)
 *
 * 27 characters over 6 positions is ~387 million codes — ample for a county,
 * and `referral_code` is unique so a collision retries rather than corrupts.
 */
const CODE_ALPHABET = "ACDEFGHJKMNPQRTUVWXY2346789";

export function generateReferralCode(random: () => number = Math.random): string {
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
  }
  return `LORE-${out}`;
}
