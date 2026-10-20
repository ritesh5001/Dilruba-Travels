import { config } from "../config.ts";

export type Email = { to: string; subject: string; html: string; text: string };

/**
 * Sends through Resend's REST API. Never throws: a failed email must not fail the booking
 * or payment that triggered it, so failures are logged and reported as `false`.
 * Without RESEND_API_KEY (local development) the email is printed instead.
 */
export async function sendEmail(email: Email): Promise<boolean> {
  if (!config.RESEND_API_KEY) {
    console.info(`[email] (not sent: no RESEND_API_KEY) to=${email.to} subject="${email.subject}"\n${email.text}\n`);
    return true;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${config.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: config.EMAIL_FROM,
        to: [email.to],
        reply_to: config.EMAIL_REPLY_TO,
        subject: email.subject,
        html: email.html,
        text: email.text,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.error(`[email] Resend rejected "${email.subject}" to ${email.to}: ${res.status} ${await res.text()}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[email] Failed to send "${email.subject}" to ${email.to}:`, err);
    return false;
  }
}

/** Sends to the owner's alert address, if one is configured. */
export async function notifyAdmin(email: Omit<Email, "to">) {
  if (!config.ADMIN_NOTIFY_EMAIL) return false;
  return sendEmail({ ...email, to: config.ADMIN_NOTIFY_EMAIL });
}
