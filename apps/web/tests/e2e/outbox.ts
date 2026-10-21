import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { expect, type Page } from "@playwright/test";

/** Where the app writes emails during end-to-end tests (MAIL_OUTBOX_DIR, see lib/email.ts). */
export const OUTBOX_DIR = path.resolve(".outbox", "e2e");

/**
 * One owner address per browser project and spec file, so tests running in parallel never read
 * each other's sign-in codes.
 */
export const ownerEmailFor = (
  project: string,
  spec: "admin" | "checkout" | "track" | "discounts" = "admin",
) =>
  spec === "admin" ? `owner-${project}@cozycakes.test` : `owner-${spec}-${project}@cozycakes.test`;

export const TEST_OWNER_EMAILS = ["phone", "desktop"].flatMap((project) => [
  ownerEmailFor(project, "admin"),
  ownerEmailFor(project, "checkout"),
  ownerEmailFor(project, "track"),
  ownerEmailFor(project, "discounts"),
]);

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

/** Signs in to the back office with a code read from the outbox. */
export async function signInAsOwner(page: Page, email: string) {
  const since = Date.now();
  await page.goto("/admin/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Email me a code" }).click();
  await expect(page.getByText("a code is on its way")).toBeVisible();
  await page.getByLabel("6-digit code").fill(await latestCode(email, since));
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Hello, baker" })).toBeVisible();
}
