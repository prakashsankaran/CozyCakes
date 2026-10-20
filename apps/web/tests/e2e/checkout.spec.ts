import { createHmac } from "node:crypto";
import { expect, test, type APIRequestContext, type Page, type TestInfo } from "@playwright/test";
import {
  CartItemSchema,
  type Availability,
  type CakeDetail,
  type CheckoutRequest,
} from "@cozycakes/core";
import { expectAccessible } from "./a11y";
import { emailsTo, ownerEmailFor, signInAsOwner } from "./outbox";

// US3: Choose a date, check out, and pay online. Payments use the fake test provider
// (PAYMENT_PROVIDER=test in playwright.config.ts), which signs results like Razorpay does.
// Relies on the development seed: Chocolate Truffle Dream is ₹1,400 for 1 kg, 2 days' notice.

const CAKE = "chocolate-truffle-dream";

/** A 1 kg cake with the first choice of every required group, as a cart line. */
async function cartLine(request: APIRequestContext) {
  const cake = (await (await request.get(`/api/v1/cakes/${CAKE}`)).json()) as CakeDetail;
  const size = cake.sizes.find((s) => s.label === "1 kg")!;
  const options = cake.optionGroups.filter((g) => g.required).map((g) => g.options[0]!);
  return {
    id: `line-${Date.now()}`,
    cakeId: cake.id,
    sizeId: size.id,
    optionIds: options.map((o) => o.id),
    message: "",
    referencePhoto: null,
    quantity: 1,
    snapshot: {
      cakeSlug: cake.slug,
      cakeName: cake.name,
      sizeLabel: size.label,
      choices: options.map((o) => o.name),
      unitPrice: size.price + options.reduce((sum, o) => sum + o.priceDelta, 0),
    },
  };
}

async function fillCart(page: Page) {
  const line = await cartLine(page.request);
  await page.goto("/");
  await page.evaluate((item) => {
    localStorage.setItem("cozycakes.cart.v1", JSON.stringify([item]));
  }, line);
  return line;
}

/**
 * An open day and its first time slot. Each test and browser project takes a different open day
 * (`slot`), so tests running side by side don't fill each other's dates.
 */
async function pickOpenDay(page: Page, testInfo: TestInfo, slot: number) {
  const n = slot * 2 + (testInfo.project.name === "phone" ? 0 : 1);
  const day = page.locator('label:has(input[name="date"]:not([disabled]))').nth(n);
  await day.click();
  await page.locator('label:has(input[name="slot"])').first().click();
}

async function fillDetails(page: Page, email: string) {
  await page.getByLabel("Your name").fill("Ananya Rao");
  await page.getByLabel(/^Mobile number/).fill("98765 43210");
  await page.getByLabel(/^Email/).fill(email);
}

const customerEmail = (testInfo: TestInfo) =>
  `ananya-${testInfo.project.name}-${Date.now().toString(36)}@example.com`;

const payButton = (page: Page) => page.getByRole("button", { name: /^Pay ₹/ }).last();
const testPayment = (page: Page) => page.getByRole("dialog", { name: "Test payment" });

test("pay as a guest for pickup and land on the celebration", async ({ page }, testInfo) => {
  await fillCart(page);
  await page.goto("/cart");
  await page.getByRole("link", { name: "Checkout" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Checkout" })).toBeVisible();

  await page
    .locator("label")
    .filter({ hasText: /^🏡Pickup/ })
    .click();
  // Scenario 1: today and tomorrow are too soon for a 2-day cake.
  await expect(page.getByText(/need 2 days of baking time/)).toBeVisible();
  await pickOpenDay(page, testInfo, 0);
  const email = customerEmail(testInfo);
  await fillDetails(page, email);
  await expect(page.getByTestId("checkout-total")).toHaveText("₹1,400");
  await expectAccessible(page);

  await payButton(page).click();
  await testPayment(page).getByRole("button", { name: "Pay ₹1,400" }).click();

  await expect(page).toHaveURL(/\/orders\/[\w-]{20,}\?placed=1$/);
  await expect(page.getByRole("heading", { level: 1, name: "Thank you, Ananya!" })).toBeVisible();
  const number = (await page.getByText(/^Order CC-\d+$/).textContent())!.replace("Order ", "");
  await expect(page.getByText("Confirmed", { exact: true })).toBeVisible();
  await expectAccessible(page);

  // Scenario 3: a confirmation message with the order number and tracking link.
  await expect.poll(async () => (await emailsTo(email, 0)).length).toBe(1);
  const [confirmation] = await emailsTo(email, 0);
  expect(confirmation!.subject).toContain(number);
  expect(confirmation!.text).toContain(new URL(page.url()).pathname);

  // The cart empties once the cakes are ordered.
  await page.goto("/cart");
  await expect(page.getByText("Your cart is empty")).toBeVisible();
});

test("delivery outside the area offers pickup instead", async ({ page }) => {
  await fillCart(page);
  await page.goto("/checkout");
  await page
    .locator("label")
    .filter({ hasText: /^🛵Delivery/ })
    .click();
  await page.getByLabel("Delivery PIN code").fill("110001");
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("I don’t deliver to 110001 yet.")).toBeVisible();
  await page.getByRole("button", { name: "Pick it up instead" }).click();
  await expect(page.getByRole("radio", { name: /Pickup/ })).toBeChecked();
});

test("a declined payment keeps every detail for a one-tap retry", async ({ page }, testInfo) => {
  await fillCart(page);
  await page.goto("/checkout");
  await page
    .locator("label")
    .filter({ hasText: /^🏡Pickup/ })
    .click();
  await pickOpenDay(page, testInfo, 1);
  await fillDetails(page, customerEmail(testInfo));

  await payButton(page).click();
  await testPayment(page).getByRole("button", { name: "Decline" }).click();
  await expect(page.getByText(/Nothing was charged/)).toBeVisible();
  await expect(page.getByLabel("Your name")).toHaveValue("Ananya Rao");

  await payButton(page).click();
  await testPayment(page).getByRole("button", { name: /^Pay/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Thank you, Ananya!" })).toBeVisible();
});

test("a day that fills up is refused before any payment", async ({ page }, testInfo) => {
  const line = await fillCart(page);
  const availability = (await (
    await page.request.get("/api/v1/availability?lead_days=2")
  ).json()) as Availability;
  // A completely free day well ahead, different for each browser project.
  const free = availability.days.filter((d) => d.status === "available" && d.remaining === 3);
  const day = free[Math.min(free.length - 1, 20 + testInfo.parallelIndex * 5)]!;

  await page.goto("/checkout");
  await page
    .locator("label")
    .filter({ hasText: /^🏡Pickup/ })
    .click();
  await page.getByRole("radio", { name: new RegExp(dayLabel(day.date)) }).check({ force: true });
  await page.locator('label:has(input[name="slot"])').first().click();
  await fillDetails(page, customerEmail(testInfo));

  // Other customers take the last places while this one is still typing.
  const item = CartItemSchema.parse(line);
  const body = (email: string): CheckoutRequest => ({
    items: [item],
    fulfilment: "pickup",
    date: day.date,
    slotId: availability.slots[0]!.id,
    contact: { name: "Someone Else", email, phone: "9876543210" },
    address: null,
    note: "",
  });
  for (let i = 0; i < 3; i++) {
    const res = await page.request.post("/api/v1/checkouts", {
      data: body(`other${i}@example.com`),
    });
    expect(res.status()).toBe(201);
  }
  const fourth = await page.request.post("/api/v1/checkouts", { data: body("late@example.com") });
  expect(fourth.status()).toBe(409);
  expect((await fourth.json()).error.code).toBe("DATE_FULL");

  // Scenario 5: told before being charged, and asked to pick another date.
  await payButton(page).click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "That day just filled up. Please pick another date." }),
  ).toBeVisible();
  await expect(testPayment(page)).toHaveCount(0);
  await expect(
    page.getByRole("radio", { name: new RegExp(`${dayLabel(day.date)}, fully booked`) }),
  ).toBeDisabled();
});

test("the owner's delivery area sets the delivery fee", async ({ page }, testInfo) => {
  const pin = testInfo.project.name === "phone" ? "560091" : "560092";
  await signInAsOwner(page, ownerEmailFor(testInfo.project.name, "checkout"));
  await page.getByRole("link", { name: "Dates" }).click();
  const zones = page.getByRole("form", { name: "Add a delivery PIN code" });
  await zones.getByLabel("PIN code").fill(pin);
  await zones.getByLabel("Fee (₹)").fill("80");
  await zones.getByRole("button", { name: "Add" }).click();
  await expect(page.getByText(`Delivering to ${pin}`)).toBeVisible();

  await fillCart(page);
  await page.goto("/checkout");
  await page
    .locator("label")
    .filter({ hasText: /^🛵Delivery/ })
    .click();
  await page.getByLabel("Delivery PIN code").fill(pin);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText(`Yes! I deliver to ${pin} for ₹80.`)).toBeVisible();
  await pickOpenDay(page, testInfo, 2);
  await fillDetails(page, customerEmail(testInfo));
  await page.getByLabel("House and street").fill("12 MG Road");
  await page.getByLabel("City").fill("Bengaluru");
  await expect(page.getByTestId("checkout-total")).toHaveText("₹1,480");
  await payButton(page).click();
  await testPayment(page).getByRole("button", { name: "Pay ₹1,480" }).click();
  await expect(page.getByText(/To 12 MG Road, Bengaluru, 56009\d/)).toBeVisible();
});

/** Matches "Friday 24 October" (browsers and Node disagree about the comma). */
function dayLabel(date: string) {
  const label = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
  return label.replace(",", ",?");
}

test("a payment reported twice makes exactly one order", async ({ request }, testInfo) => {
  const item = CartItemSchema.parse(await cartLine(request));
  const availability = (await (
    await request.get("/api/v1/availability?lead_days=2")
  ).json()) as Availability;
  const open = availability.days.filter((d) => d.status === "available");
  const day = open[Math.min(open.length - 1, 30 + (testInfo.project.name === "phone" ? 0 : 1))]!;
  const created = await request.post("/api/v1/checkouts", {
    data: {
      items: [item],
      fulfilment: "pickup",
      date: day.date,
      slotId: availability.slots[0]!.id,
      contact: { name: "Ravi", email: customerEmail(testInfo), phone: "9876543210" },
      address: null,
      note: "",
    } satisfies CheckoutRequest,
  });
  expect(created.status()).toBe(201);
  const { checkoutId } = (await created.json()) as { checkoutId: string };
  const result = await (
    await request.post(`/api/v1/checkouts/${checkoutId}/test-payment`, {
      data: { outcome: "success" },
    })
  ).json();

  // The browser callback and the provider's webhook may both report the same payment (SC-006).
  const first = await request.post(`/api/v1/checkouts/${checkoutId}/payment`, { data: result });
  const second = await request.post(`/api/v1/checkouts/${checkoutId}/payment`, { data: result });
  expect(first.status()).toBe(200);
  expect(await second.json()).toEqual(await first.json());
  const status = await (await request.get(`/api/v1/checkouts/${checkoutId}`)).json();
  expect(status).toMatchObject({ status: "paid", orderNumber: (await first.json()).orderNumber });

  // A forged signature is refused.
  const forged = await request.post(`/api/v1/checkouts/${checkoutId}/payment`, {
    data: { ...result, providerPaymentId: "test_pay_forged" },
  });
  expect(forged.status()).toBe(400);
});

test("the payment webhook confirms orders when the browser never reports back", async ({
  request,
}, testInfo) => {
  const item = CartItemSchema.parse(await cartLine(request));
  const availability = (await (
    await request.get("/api/v1/availability?lead_days=2")
  ).json()) as Availability;
  const open = availability.days.filter((d) => d.status === "available");
  const day = open[Math.min(open.length - 1, 34 + (testInfo.project.name === "phone" ? 0 : 1))]!;
  const created = await request.post("/api/v1/checkouts", {
    data: {
      items: [item],
      fulfilment: "pickup",
      date: day.date,
      slotId: availability.slots[0]!.id,
      contact: { name: "Meera", email: customerEmail(testInfo), phone: "9876543210" },
      address: null,
      note: "",
    } satisfies CheckoutRequest,
  });
  const { checkoutId, payment } = (await created.json()) as {
    checkoutId: string;
    payment: { orderId: string };
  };
  const body = JSON.stringify({
    event: "payment.captured",
    payload: {
      payment: { entity: { id: `pay_${checkoutId.slice(0, 8)}`, order_id: payment.orderId } },
    },
  });
  const sign = (secret: string) => createHmac("sha256", secret).update(body).digest("hex");
  const post = (signature: string) =>
    request.post("/api/webhooks/razorpay", {
      headers: { "content-type": "application/json", "x-razorpay-signature": signature },
      data: body,
    });

  expect((await post(sign("not-the-secret"))).status()).toBe(400);
  // The test provider signs webhooks with its (non-secret) test key, like Razorpay's webhook secret.
  expect((await post(sign("cozycakes-test-payments"))).status()).toBe(200);
  const status = await (await request.get(`/api/v1/checkouts/${checkoutId}`)).json();
  expect(status).toMatchObject({ status: "paid", orderNumber: expect.stringMatching(/^CC-\d+$/) });
});
