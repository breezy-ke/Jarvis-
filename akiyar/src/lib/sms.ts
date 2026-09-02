import "server-only";

/**
 * SMS delivery.
 *
 * Africa's Talking is the intended production gateway — it is the only sane
 * option for Kenyan shortcodes — but a shortcode needs CA approval and takes
 * 4–8 weeks to provision. Until those credentials exist, this falls back to a
 * console transport so the whole verification flow can be built and tested.
 *
 * The fallback is loud and refuses to run in production: shipping a campaign
 * where "we sent you a code" is a lie would be worse than shipping nothing.
 */

type SendResult =
  | { ok: true; devCode?: string }
  | { ok: false; error: string };

export async function sendOtpSms(phone: string, code: string): Promise<SendResult> {
  const message = `${code} is your code to join the Ekusi Lore supporter register. It expires in 10 minutes. Keep it to yourself.`;

  const username = process.env.AT_USERNAME;
  const apiKey = process.env.AT_API_KEY;
  // Optional and deliberately empty by default. Africa's Talking BLOCKS a
  // custom sender that has not been approved, so before the shortcode or
  // alphanumeric ID is provisioned we send nothing here and AT delivers from a
  // shared short code. Set AT_SENDER_ID only once it is live.
  const senderId = process.env.AT_SENDER_ID?.trim();

  if (!username || !apiKey) {
    if (process.env.NODE_ENV === "production") {
      console.error("[sms] No SMS gateway configured in production. Refusing to fake delivery.");
      return {
        ok: false,
        error: "SMS delivery is not available right now. Please try again later.",
      };
    }

    console.warn(
      `\n[sms:dev] → ${phone}\n[sms:dev]   ${message}\n[sms:dev]   (set AT_USERNAME and AT_API_KEY to send for real)\n`,
    );
    return { ok: true, devCode: code };
  }

  // The AT username "sandbox" is the documented switch to the free test
  // network. Keeping the switch on the username means one variable flips the
  // whole app between testing and live, with no code change.
  const endpoint =
    username === "sandbox"
      ? "https://api.sandbox.africastalking.com/version1/messaging"
      : "https://api.africastalking.com/version1/messaging";

  const params: Record<string, string> = { username, to: phone, message };
  if (senderId) params.from = senderId;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        apiKey,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams(params),
      // A supporter on 2G should not sit on a spinner because the gateway is slow.
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      console.error(`[sms] gateway returned ${res.status}: ${await res.text()}`);
      return { ok: false, error: "We could not send your code. Please try again." };
    }

    const body = (await res.json()) as {
      SMSMessageData?: { Recipients?: Array<{ status: string; statusCode: number }> };
    };

    const recipient = body.SMSMessageData?.Recipients?.[0];
    if (!recipient || recipient.statusCode >= 400) {
      console.error(`[sms] delivery rejected: ${JSON.stringify(body)}`);
      return {
        ok: false,
        error: "That number could not receive the code. Check it and try again.",
      };
    }

    return { ok: true };
  } catch (err) {
    console.error(`[sms] send failed: ${(err as Error).message}`);
    return { ok: false, error: "We could not reach the SMS network. Please try again." };
  }
}
