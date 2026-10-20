import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Transactional email (research.md §10). Sends through Resend's HTTP API when `RESEND_API_KEY` is
 * set. For local development and end-to-end tests, `MAIL_OUTBOX_DIR` writes each email to a JSON
 * file instead, so sign-in codes can be read without a mail account.
 */

export type Email = { to: string; subject: string; text: string; html: string };

const FROM = process.env.EMAIL_FROM ?? "CozyCakes <onboarding@resend.dev>";

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY || process.env.MAIL_OUTBOX_DIR);
}

export async function sendEmail(email: Email): Promise<void> {
  const outbox = process.env.MAIL_OUTBOX_DIR;
  if (outbox) {
    await mkdir(outbox, { recursive: true });
    const file = `${Date.now()}-${email.to.replace(/[^a-z0-9]/gi, "_")}.json`;
    await writeFile(path.join(outbox, file), JSON.stringify(email, null, 2));
    return;
  }
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("Email is not set up: add RESEND_API_KEY");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from: FROM, ...email }),
  });
  if (!res.ok) throw new Error(`Resend refused the email: ${res.status} ${await res.text()}`);
}

export function signInCodeEmail(to: string, code: string): Email {
  return {
    to,
    subject: `${code} is your CozyCakes sign-in code`,
    text: `Your CozyCakes sign-in code is ${code}. It works for 10 minutes. If you didn't ask for it, you can ignore this email.`,
    html: `<div style="font-family:system-ui,sans-serif;background:#fff8f0;padding:32px;color:#3b2420">
  <p style="font-size:18px;margin:0 0 12px">Your CozyCakes sign-in code</p>
  <p style="font-size:36px;font-weight:700;letter-spacing:8px;margin:0 0 16px">${code}</p>
  <p style="margin:0;color:#5c3b33">It works for 10 minutes. If you didn't ask for it, you can ignore this email.</p>
</div>`,
  };
}
