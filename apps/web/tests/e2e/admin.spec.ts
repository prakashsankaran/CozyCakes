import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { expectAccessible } from "./a11y";
import { emailsTo, latestCode, ownerEmailFor } from "./outbox";

// US5: The owner runs the shop from the back office. Each browser project signs in as its own
// owner (see playwright.config.ts) and names what it creates uniquely, so runs never collide and
// the sample cakes other tests rely on stay untouched.

test.describe.configure({ mode: "serial" });

async function signIn(page: Page, testInfo: TestInfo) {
  const email = ownerEmailFor(testInfo.project.name);
  const since = Date.now();
  await page.goto("/admin/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Email me a code" }).click();
  await expect(page.getByText("a code is on its way")).toBeVisible();
  await page.getByLabel("6-digit code").fill(await latestCode(email, since));
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Hello, baker" })).toBeVisible();
}

const unique = (testInfo: TestInfo) => `${testInfo.project.name} ${Date.now().toString(36)}`;

test("the kitchen is closed to visitors and strangers get no code", async ({ page }) => {
  await page.goto("/admin/menu");
  await expect(page).toHaveURL(/\/admin\/sign-in$/);
  await expect(page.getByRole("heading", { name: "The CozyCakes kitchen" })).toBeVisible();
  await expectAccessible(page);

  const since = Date.now();
  await page.getByLabel("Email").fill("stranger@example.com");
  await page.getByRole("button", { name: "Email me a code" }).click();
  // Same answer as for the owner, so the form doesn't reveal who has access...
  await expect(page.getByText("a code is on its way")).toBeVisible();
  // ...but nothing is sent.
  expect(await emailsTo("stranger@example.com", since)).toEqual([]);
});

test("the owner adds a cake with its own choices and it appears in the shop", async ({
  page,
}, testInfo) => {
  await signIn(page, testInfo);
  await expectAccessible(page);
  const id = unique(testInfo);

  // A new group of builder choices.
  await page.getByRole("link", { name: "Choices" }).click();
  await page.getByRole("button", { name: "+ Add a group of choices" }).click();
  const group = page.getByRole("form", { name: "New group of choices" });
  await group.getByLabel("Group name").fill(`Sprinkles ${id}`);
  await group.getByRole("button", { name: "+ Add a choice" }).click();
  await group.getByLabel("Choice", { exact: true }).fill("Gold stars");
  await group.getByLabel("Extra (₹)").fill("50");
  await group.getByRole("button", { name: "Save group" }).click();
  await expect(page.getByRole("form", { name: `Sprinkles ${id} choices` })).toBeVisible();
  await expectAccessible(page);

  // A new cake that offers it.
  await page.getByRole("link", { name: "Menu" }).click();
  await page.getByRole("link", { name: "Add a cake" }).click();
  await page.getByLabel("Cake name").fill(`Test Cake ${id}`);
  const slug = await page.getByLabel("Web address").inputValue();
  expect(slug).toMatch(/^test-cake-/);
  await page.getByLabel("One-line description").fill("Made by the end-to-end tests.");
  await page.getByLabel("Price (₹)").fill("999");
  await page
    .locator("label")
    .filter({ hasText: `Sprinkles ${id}` })
    .click();
  await page.locator("label").filter({ hasText: "On the menu" }).click();
  await expectAccessible(page);
  await page.getByRole("button", { name: "Add cake" }).click();
  await expect(page.getByText(`Saved Test Cake ${id}.`, { exact: false })).toBeVisible();

  // The shop shows it straight away, with the new choice in the builder.
  await page.goto(`/cakes/${slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Test Cake ${id}`);
  await page.locator("label").filter({ hasText: /^1 kg/ }).click();
  await expect(page.getByTestId("live-price")).toHaveText("₹999");
  await page.getByRole("button", { name: `Next: Sprinkles ${id}` }).click();
  await page.locator("label").filter({ hasText: "Gold stars" }).click();
  await expect(page.getByTestId("live-price")).toHaveText("₹1,049");

  // Archiving takes it off the shop.
  await page.goto("/admin/menu");
  await page.getByLabel(`Status of Test Cake ${id}`).selectOption("archived");
  await expect(page.getByRole("heading", { name: `Test Cake ${id}` })).toHaveCount(0);
  await page.goto(`/cakes/${slug}`);
  await expect(page.getByRole("heading", { name: /someone ate this page/ })).toBeVisible();
});

test("the owner closes a day and opens it again", async ({ page }, testInfo) => {
  await signIn(page, testInfo);
  const id = unique(testInfo);
  // Far enough ahead to stay clear of other tests, and a different day per browser project.
  const day = new Date(Date.now() + (150 + testInfo.parallelIndex * 3) * 86_400_000);
  const date = day.toISOString().slice(0, 10);

  await page.getByRole("link", { name: "Dates" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Dates and capacity" })).toBeVisible();
  const form = page.getByRole("form", { name: "Add a special day" });
  await form.getByLabel("Date").fill(date);
  await form.getByLabel("Closed, no orders").check();
  await form.getByLabel(/^Note/).fill(`Holiday ${id}`);
  await form.getByRole("button", { name: "Save day" }).click();
  await expect(form.getByRole("status")).toHaveText(/^Saved /);

  const row = page.getByRole("listitem").filter({ hasText: `Holiday ${id}` });
  await expect(row).toContainText("Closed");
  await expectAccessible(page);
  await row.getByRole("button", { name: /^Remove/ }).click();
  await expect(row).toHaveCount(0);
});
