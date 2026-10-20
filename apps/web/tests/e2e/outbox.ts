import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { expect } from "@playwright/test";

/** Where the app writes emails during end-to-end tests (MAIL_OUTBOX_DIR, see lib/email.ts). */
export const OUTBOX_DIR = path.resolve(".outbox", "e2e");

/** One owner per browser project, so parallel projects never read each other's codes. */
export const TEST_OWNER_EMAILS = ["owner-phone@cozycakes.test", "owner-desktop@cozycakes.test"];

export const ownerEmailFor = (project: string) => `owner-${project}@cozycakes.test`;

type Email = { to: string; subject: string; text: string };

/** Emails to `to` written at or after `since` (outbox files are named `<ms>-<address>.json`). */
export async function emailsTo(to: string, since: number): Promise<Email[]> {
  const files = await readdir(OUTBOX_DIR).catch(() => [] as string[]);
  const mine = files
    .filter((f) => Number(f.split("-")[0]) >= since)
    .filter((f) => f.endsWith(`-${to.replace(/[^a-z0-9]/gi, "_")}.json`))
    .sort();
  return Promise.all(
    mine.map(async (f) => JSON.parse(await readFile(path.join(OUTBOX_DIR, f), "utf8")) as Email),
  );
}

/** Waits for the newest sign-in code sent to `to` since `since`. */
export async function latestCode(to: string, since: number): Promise<string> {
  let code = "";
  await expect
    .poll(async () => {
      const emails = await emailsTo(to, since);
      code = emails.at(-1)?.subject.match(/^(\d{6}) /)?.[1] ?? "";
      return code;
    })
    .toMatch(/^\d{6}$/);
  return code;
}
