import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { expectAccessible } from "./a11y";
import { emailsTo, ownerEmailFor, signInAsOwner } from "./outbox";
import { cartLine } from "./shop";

// UPI paid by hand (research.md §6): no gateway, so the order waits for payment and the baker
// confirms it. The header below turns the fake test provider off for this browser, so checkout
// falls through to UPI exactly as on the live site without Razorpay keys.

// Both tests sign in as the same owner, so they take turns reading sign-in codes.
test.describe.configure({ mode: "serial" });

const UPI_ID = "cozycakes@okicici";
const UPI_OFF = { "x-cozycakes-test-payments": "off" };

async function signInAndSetUpi(page: Page, testInfo: TestInfo) {
  await signInAsOwner(page, ownerEmailFor(testInfo.project.name, "upi"));
  const form = page.getByRole("form", { name: "Getting paid by UPI" });
  await form.getByLabel("UPI ID").fill("not-a-upi-id");
  await form.getByRole("button", { name: "Save" }).click();
  await expect(form.getByRole("alert")).toHaveText("That doesn't look like a UPI ID (name@bank)");
  // Both browser projects save the same details, so running side by side changes nothing.
  await form.getByLabel("UPI ID").fill(UPI_ID);
  await form.getByLabel("Name shown in their UPI app").fill("CozyCakes Kitchen");
  await form.getByRole("button", { name: "Save" }).click();
  await expect(form.getByRole("status")).toHaveText(
    "Saved. Customers can now order and pay you by UPI.",
  );
}

test("a customer orders, pays by UPI, and the baker confirms the payment", async ({
  page,
  browser,
}, testInfo) => {
  // The owner switches UPI on from the back office, in a browser of their own.
  const kitchen = await (await browser.newContext()).newPage();
  await signInAndSetUpi(kitchen, testInfo);

  // The customer checks out: no payment window, the order is placed straight away.
  await page.setExtraHTTPHeaders(UPI_OFF);
  const line = await cartLine(page.request);
  await page.goto("/");
  await page.evaluate(
    (item) => localStorage.setItem("cozycakes.cart.v1", JSON.stringify([item])),
    line,
  );
  await page.goto("/checkout");
  await page
    .locator("label")
    .filter({ hasText: /^🏡Pickup/ })
    .click();
  const n = 3 * 2 + (testInfo.project.name === "phone" ? 0 : 1);
  await page.locator('label:has(input[name="date"]:not([disabled]))').nth(n).click();
  await page.locator('label:has(input[name="slot"])').first().click();
  const email = `upi-${testInfo.project.name}-${Date.now().toString(36)}@example.com`;
  await page.getByLabel("Your name").fill("Meera Iyer");
  await page.getByLabel(/^Mobile number/).fill("98765 43210");
  await page.getByLabel(/^Email/).fill(email);
  await expect(page.getByText(/Next you pay by UPI with any app/)).toBeVisible();
  const since = Date.now();
  await page.getByRole("button", { name: "Place order ₹1,400" }).click();

  // The order page holds the date and shows how to pay.
  await expect(page).toHaveURL(/\/orders\/[\w-]{20,}\?placed=1$/);
  await expect(page.getByRole("heading", { level: 1, name: "Almost there, Meera!" })).toBeVisible();
  const number = (await page.getByText(/^Order CC-\d+$/).textContent())!.replace("Order ", "");
  const pay = page.getByRole("region", { name: "Pay ₹1,400 by UPI" });
  await expect(pay.getByTestId("upi-id")).toHaveText(UPI_ID);
  await expect(
    pay.getByRole("img", { name: /QR code to pay ₹1,400 to CozyCakes Kitchen/ }),
  ).toBeVisible();
  const link = await pay.getByRole("link", { name: "Open a UPI app to pay" }).getAttribute("href");
  expect(link).toBe(
    `upi://pay?pa=cozycakes%40okicici&pn=CozyCakes%20Kitchen&am=1400.00&cu=INR&tn=CozyCakes%20${number}`,
  );
  await expect(
    page
      .getByRole("region", { name: "Order details" })
      .getByText("Awaiting payment", { exact: true }),
  ).toBeVisible();
  await expectAccessible(page);

  // The baker hears about it, marked as waiting for payment; the cart is empty.
  const owner = ownerEmailFor(testInfo.project.name, "upi");
  await expect
    .poll(async () => (await emailsTo(owner, since)).map((e) => e.subject))
    .toContainEqual(expect.stringContaining(`${number}`));
  expect((await emailsTo(owner, since)).find((e) => e.subject.includes(number))!.subject).toContain(
    "awaiting UPI payment",
  );

  // "I've paid", with the reference from their UPI app.
  await pay.getByLabel(/UPI reference/).fill("1234 5678 901");
  await pay.getByRole("button", { name: "I’ve paid" }).click();
  await expect(pay.getByRole("alert")).toHaveText("A UPI reference is 12 digits");
  await pay.getByLabel(/UPI reference/).fill("1234 5678 9012");
  await pay.getByRole("button", { name: "I’ve paid" }).click();
  await expect(page.getByRole("heading", { name: "Thank you for paying!" })).toBeVisible();
  await expect
    .poll(async () => (await emailsTo(owner, since)).map((e) => e.subject))
    .toContainEqual(`${number}: customer says they've paid ₹1,400`);

  // The baker sees the claim on the board and confirms the money arrived.
  await kitchen.goto("/admin/orders");
  const card = kitchen.getByRole("link", { name: `Order ${number} for Meera Iyer` });
  await expect(card.getByText("Says they’ve paid: check UPI")).toBeVisible();
  await card.click();
  await expect(kitchen.getByRole("note")).toContainText("UPI reference 123456789012");
  await kitchen.getByRole("button", { name: "Payment received" }).click();
  await expect(kitchen.getByRole("button", { name: "Start baking" })).toBeVisible();
  await expect(kitchen.getByRole("note")).toHaveCount(0);

  // The customer's page turns to Confirmed, and they get the confirmation.
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Thank you, Meera!" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Pay ₹1,400 by UPI" })).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Order details" }).getByText("Confirmed", { exact: true }),
  ).toBeVisible();
  await expect
    .poll(async () => (await emailsTo(email, since)).map((e) => e.subject))
    .toContainEqual(`Your CozyCakes order ${number} is confirmed 🎂`);
  await kitchen.context().close();
});

test("cancelling an unpaid UPI order needs no refund", async ({ browser, request }, testInfo) => {
  const kitchen = await (await browser.newContext()).newPage();
  await signInAndSetUpi(kitchen, testInfo);
  const item = await cartLine(request);
  const availability = await (
    await request.get("/api/v1/availability?lead_days=2", { headers: UPI_OFF })
  ).json();
  const open = availability.days.filter((d: { status: string }) => d.status === "available");
  const day = open[Math.min(open.length - 1, 24 + (testInfo.project.name === "phone" ? 0 : 1))];
  const created = await request.post("/api/v1/checkouts", {
    headers: UPI_OFF,
    data: {
      items: [item],
      fulfilment: "pickup",
      date: day.date,
      slotId: availability.slots[0].id,
      contact: { name: "Kabir Shah", email: "kabir@example.com", phone: "9876543210" },
      address: null,
      note: "",
    },
  });
  expect(created.status()).toBe(201);
  const { payment } = await created.json();
  expect(payment.provider).toBe("upi");

  const tracked = await (await request.get(`/api/v1/orders/track/${payment.trackingToken}`)).json();
  expect(tracked.status).toBe("awaiting_payment");
  expect(tracked.upi).toMatchObject({ upiId: UPI_ID, claimed: false });
  expect(JSON.stringify(tracked)).not.toContain("kabir@example.com");

  await kitchen.goto("/admin/orders");
  await kitchen.getByRole("link", { name: `Order ${payment.orderNumber} for Kabir Shah` }).click();
  await kitchen.getByRole("button", { name: "Cancel order…" }).click();
  const cancel = kitchen.getByRole("form", { name: "Cancel this order" });
  await expect(cancel.getByText("They haven't paid, so there's nothing to refund.")).toBeVisible();
  await cancel.getByLabel("Why are you cancelling?").fill("Asked to cancel on Instagram");
  await cancel.getByRole("button", { name: "Cancel order" }).click();
  await expect(kitchen.getByText("Cancelled because:")).toBeVisible();

  // A cancelled order can't be claimed as paid.
  const claim = await request.post(`/api/v1/orders/track/${payment.trackingToken}/paid`, {
    data: { reference: "" },
  });
  expect(claim.status()).toBe(409);
  await kitchen.context().close();
});
