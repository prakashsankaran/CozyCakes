import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { expectAccessible } from "./a11y";
import { emailsTo, ownerEmailFor, signInAsOwner } from "./outbox";
import { placePaidOrder } from "./shop";

// US4: Track my order. The baker moves orders along on the back-office board; the customer's
// private order page and emails follow each step. Payments use the fake test provider.

const customer = (testInfo: TestInfo, first: string) => {
  const tag = `${testInfo.project.name}-${Date.now().toString(36)}`;
  return { name: `${first} ${tag}`, email: `${first.toLowerCase()}-${tag}@example.com` };
};

async function openOrderInKitchen(page: Page, number: string, name: string) {
  await page.getByRole("link", { name: "Orders", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Orders" })).toBeVisible();
  await page.getByRole("link", { name: `Order ${number} for ${name}` }).click();
  await expect(page.getByRole("heading", { level: 1, name: number })).toBeVisible();
}

test("the baker moves a pickup order along and the customer follows it", async ({
  page,
  browser,
}, testInfo) => {
  const who = customer(testInfo, "Tara");
  const since = Date.now();
  const placed = await placePaidOrder(page.request, testInfo, { slot: 20, ...who });

  // Scenario 1: the private link shows the order without logging in.
  const shopper = await (await browser.newContext()).newPage();
  await shopper.goto(`/orders/${placed.trackingToken}`);
  const firstName = who.name.split(" ")[0];
  await expect(
    shopper.getByRole("heading", { level: 1, name: `Thank you, ${firstName}!` }),
  ).toBeVisible();
  const progress = shopper.getByRole("list", { name: "Order progress" });
  await expect(progress.locator('[aria-current="step"]')).toContainText("Confirmed");
  await expect(progress).toContainText("Ready to collect");
  await expectAccessible(shopper);

  await signInAsOwner(page, ownerEmailFor(testInfo.project.name, "track"));
  await openOrderInKitchen(page, placed.orderNumber, who.name);
  // The board stays mounted but hidden after navigating (Activity), so look at what is visible.
  await expect(
    page.getByText("1 × Chocolate Truffle Dream, 1 kg").filter({ visible: true }),
  ).toBeVisible();
  await expectAccessible(page);

  for (const [button, label] of [
    ["Start baking", "Baking"],
    ["Mark as ready", "Ready"],
    ["Ready to collect", "Ready to collect"],
  ] as const) {
    await page.getByRole("button", { name: button, exact: true }).click();
    await expect(
      page.getByRole("heading", { level: 1 }).locator("..").getByText(label, { exact: true }),
    ).toBeVisible();
  }

  // The timeline catches up, and only the moves that matter reached the customer (FR-019).
  await shopper.reload();
  await expect(
    shopper.getByRole("heading", { level: 1, name: `Ready when you are, ${firstName}!` }),
  ).toBeVisible();
  await expect(progress.locator('[aria-current="step"]')).toContainText("Ready to collect");
  await expect
    .poll(async () => (await emailsTo(who.email, since)).map((e) => e.subject))
    .toEqual([
      expect.stringContaining("is confirmed"),
      expect.stringContaining("is ready 🎂"),
      expect.stringContaining("is ready to collect"),
    ]);
  const [, , ready] = await emailsTo(who.email, since);
  expect(ready!.text).toContain(`/orders/${placed.trackingToken}`);

  await page.getByRole("button", { name: "Mark as collected" }).click();
  await expect(page.getByRole("button", { name: /Mark as|Cancel order/ })).toHaveCount(0);
  await expect(page.getByText(/Collected.*by you/)).toBeVisible();

  await shopper.reload();
  await expect(
    shopper.getByRole("heading", { level: 1, name: `Enjoy every slice, ${firstName}!` }),
  ).toBeVisible();
  await shopper.close();
});

test("cancelling refunds the customer and tells them why", async ({ page }, testInfo) => {
  const who = customer(testInfo, "Kabir");
  const since = Date.now();
  const placed = await placePaidOrder(page.request, testInfo, { slot: 21, ...who });

  await signInAsOwner(page, ownerEmailFor(testInfo.project.name, "track"));
  await openOrderInKitchen(page, placed.orderNumber, who.name);
  await page.getByRole("button", { name: "Cancel order…" }).click();
  const form = page.getByRole("form", { name: "Cancel this order" });
  await expect(form).toContainText("They get their ₹1,400 back in full.");
  await form.getByRole("button", { name: "Keep the order" }).click();
  await expect(form).toHaveCount(0);

  await page.getByRole("button", { name: "Cancel order…" }).click();
  await form.getByLabel("Why are you cancelling?").fill("My oven broke down that week.");
  await form.getByRole("button", { name: "Cancel and refund" }).click();
  await expect(page.getByText("Refund of ₹1,400 started.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Start baking" })).toHaveCount(0);

  await expect
    .poll(async () => (await emailsTo(who.email, since)).at(-1)?.subject ?? "")
    .toContain("was cancelled");
  const cancelled = (await emailsTo(who.email, since)).at(-1)!;
  expect(cancelled.text).toContain("My oven broke down that week.");
  expect(cancelled.text).toContain("being refunded");

  await page.goto(`/orders/${placed.trackingToken}`);
  await expect(
    page.getByRole("heading", { level: 1, name: "This order was cancelled" }),
  ).toBeVisible();
  await expect(page.getByText(/My oven broke down that week\./)).toBeVisible();
});

test("the tracking link works as data and stays private", async ({ request }, testInfo) => {
  const who = customer(testInfo, "Isha");
  const placed = await placePaidOrder(request, testInfo, { slot: 22, ...who });

  const res = await request.get(`/api/v1/orders/track/${placed.trackingToken}`);
  expect(res.status()).toBe(200);
  const order = await res.json();
  expect(order).toMatchObject({
    number: placed.orderNumber,
    status: "confirmed",
    fulfilment: "pickup",
    contactName: who.name,
    timeline: [{ status: "confirmed", at: expect.any(String) }],
  });
  // The link can be forwarded, so it never carries the customer's email or phone.
  expect(JSON.stringify(order)).not.toContain(who.email);
  expect(JSON.stringify(order)).not.toContain("9876543210");

  expect((await request.get("/api/v1/orders/track/not-a-real-token-at-all")).status()).toBe(404);
});

test("the orders board is for the kitchen only", async ({ page }) => {
  await page.goto("/admin/orders");
  await expect(page).toHaveURL(/\/admin\/sign-in/);
});
