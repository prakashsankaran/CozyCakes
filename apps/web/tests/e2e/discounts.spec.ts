import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { CartItemSchema, type Availability } from "@cozycakes/core";
import { expectAccessible } from "./a11y";
import { ownerEmailFor, signInAsOwner } from "./outbox";
import { cartLine } from "./shop";

// FR-017: discount codes. The owner creates them in the back office; customers apply one at
// checkout and pay the reduced total. Payments use the fake test provider. Relies on the seed:
// Chocolate Truffle Dream is ₹1,400 for 1 kg.

// Both tests sign in as this spec's owner, so they take turns reading sign-in codes.
test.describe.configure({ mode: "serial" });

/** A code no other test or run uses. */
const newCode = (testInfo: TestInfo, prefix: string) =>
  `${prefix}${testInfo.project.name === "phone" ? "P" : "D"}${Date.now().toString(36).toUpperCase()}`;

async function createCode(
  page: Page,
  input: { code: string; percent: string; minOrder?: string; maxUses?: string; active?: boolean },
) {
  await page.getByRole("link", { name: "Discounts" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Discount codes" })).toBeVisible();
  const newButton = page.getByRole("button", { name: "+ New code" });
  const form = page.getByRole("form", { name: "New discount code" });
  // The form starts open only while there are no codes yet.
  await expect(newButton.or(form)).toBeVisible();
  if (await newButton.isVisible()) await newButton.click();
  await form.getByLabel("Code").fill(input.code.toLowerCase());
  await form.getByLabel("Amount off").fill(input.percent);
  if (input.minOrder) await form.getByLabel(/^Minimum order/).fill(input.minOrder);
  if (input.maxUses) await form.getByLabel(/^How many times/).fill(input.maxUses);
  if (input.active === false) await form.getByLabel("Customers can use it").uncheck();
  await form.getByRole("button", { name: "Save code" }).click();
  await expect(page.getByText(`${input.code} is saved`)).toBeVisible();
}

const codeCard = (page: Page, code: string) =>
  page.getByRole("list", { name: "Your discount codes" }).getByRole("listitem").filter({
    hasText: code,
  });

test("a customer pays less with the owner's code, and its uses are counted", async ({
  page,
}, testInfo) => {
  const code = newCode(testInfo, "CAKE");
  await signInAsOwner(page, ownerEmailFor(testInfo.project.name, "discounts"));
  await createCode(page, { code, percent: "10", minOrder: "1000", maxUses: "1" });
  await expect(codeCard(page, code)).toContainText("10% off");
  await expect(codeCard(page, code)).toContainText("Working");
  await expect(codeCard(page, code)).toContainText("on orders of ₹1,000+ · used 0 of 1");
  await expectAccessible(page);

  // Shop with the code.
  const line = await cartLine(page.request);
  await page.evaluate(
    (item) => localStorage.setItem("cozycakes.cart.v1", JSON.stringify([item])),
    line,
  );
  await page.goto("/checkout");
  await page
    .locator("label")
    .filter({ hasText: /^🏡Pickup/ })
    .click();
  // A day well ahead that other specs don't use, different per browser project.
  const availability = (await (
    await page.request.get("/api/v1/availability?lead_days=2")
  ).json()) as Availability;
  const open = availability.days.filter((d) => d.status === "available");
  const day = open[Math.max(0, open.length - 1 - (testInfo.project.name === "phone" ? 0 : 1))]!;
  const label = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  })
    .format(new Date(`${day.date}T00:00:00Z`))
    .replace(",", ",?");
  await page.getByRole("radio", { name: new RegExp(`^${label}`) }).check({ force: true });
  await page.locator('label:has(input[name="slot"])').first().click();
  await page.getByLabel("Your name").fill("Riya Sen");
  await page.getByLabel(/^Mobile number/).fill("98765 43210");
  await page.getByLabel(/^Email/).fill(`riya-${code.toLowerCase()}@example.com`);

  const summary = page.getByRole("complementary", { name: "Order summary" });
  await summary.getByRole("button", { name: "Have a discount code?" }).click();
  await summary.getByLabel("Discount code").fill("NOSUCHCODE");
  await summary.getByRole("button", { name: "Apply" }).click();
  await expect(summary.getByText("That code doesn't exist. Check the spelling?")).toBeVisible();
  await summary.getByLabel("Discount code").fill(code.toLowerCase());
  await summary.getByRole("button", { name: "Apply" }).click();
  await expect(summary.getByText(`Discount (${code})`)).toBeVisible();
  await expect(summary.getByText("−₹140")).toBeVisible();
  await expect(page.getByTestId("checkout-total")).toHaveText("₹1,260");
  await expectAccessible(page);

  await page.getByRole("button", { name: "Pay ₹1,260" }).click();
  await page
    .getByRole("dialog", { name: "Test payment" })
    .getByRole("button", { name: "Pay ₹1,260" })
    .click();
  await expect(page.getByRole("heading", { level: 1, name: "Thank you, Riya!" })).toBeVisible();
  await expect(page.getByText("−₹140")).toBeVisible();

  // The single use is spent.
  await page.goto("/admin/discounts");
  await expect(codeCard(page, code)).toContainText("used 1 of 1");
  await expect(codeCard(page, code)).toContainText("Used up");
  const again = await page.request.post("/api/v1/discounts/check", {
    data: { code, items: [CartItemSchema.parse(line)] },
  });
  expect(again.status()).toBe(400);
  expect((await again.json()).error).toMatchObject({
    code: "DISCOUNT_INVALID",
    message: `${code} has been used up.`,
  });
});

test("paused codes and small orders are turned away", async ({ page }, testInfo) => {
  const code = newCode(testInfo, "BIG");
  await signInAsOwner(page, ownerEmailFor(testInfo.project.name, "discounts"));
  await createCode(page, { code, percent: "20", minOrder: "5000" });
  const item = CartItemSchema.parse(await cartLine(page.request));
  const check = () =>
    page.request.post("/api/v1/discounts/check", { data: { code, items: [item] } });

  expect((await (await check()).json()).error.message).toBe(
    `${code} works on orders of ₹5,000 or more.`,
  );
  const fourCakes = await page.request.post("/api/v1/discounts/check", {
    data: { code, items: [{ ...item, quantity: 4 }] },
  });
  expect(await fourCakes.json()).toEqual({ code, amount: 112_000, description: "20% off" });

  await codeCard(page, code)
    .getByRole("button", { name: `Pause ${code}` })
    .click();
  await expect(codeCard(page, code)).toContainText("Paused");
  expect((await (await check()).json()).error.message).toBe(`${code} isn't working right now.`);
});
