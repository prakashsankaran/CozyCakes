import { defineConfig, devices } from "@playwright/test";
import { OUTBOX_DIR, TEST_OWNER_EMAILS } from "./tests/e2e/outbox";

const port = Number(process.env.PORT ?? 3100);
// Use a preinstalled Chromium when provided (e.g. cloud dev containers); otherwise Playwright's own.
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "on-first-retry",
    launchOptions: { executablePath },
  },
  projects: [
    { name: "phone", use: { ...devices["Pixel 7"], launchOptions: { executablePath } } },
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        launchOptions: { executablePath },
      },
    },
  ],
  webServer: {
    command: `pnpm start --port ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    // A dummy Cloudinary account switches photo uploads on; tests stub the upload itself.
    // Emails go to a local outbox, each browser project signs in as its own owner, and payments
    // use the fake test provider.
    env: {
      ...(process.env as Record<string, string>),
      CLOUDINARY_URL:
        process.env.CLOUDINARY_URL ?? "cloudinary://test-key:test-secret@cozycakes-test",
      MAIL_OUTBOX_DIR: OUTBOX_DIR,
      PAYMENT_PROVIDER: "test",
      OWNER_EMAIL: TEST_OWNER_EMAILS.join(","),
    },
  },
});
