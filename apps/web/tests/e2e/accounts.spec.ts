import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { expectAccessible } from "./a11y";
import { latestCode } from "./outbox";
import { cartLine, placePaidOrder } from "./shop";

// US6: customer accounts. No passwords: a code by email, read here from the test outbox. Relies on
// the development seed: Chocolate Truffle Dream is ₹1,400 for 1 kg.

/** A fresh customer address per test and run, so sign-in codes and orders never mix. */
const customerEmail = (testInfo: TestInfo, tag: string) =>
  `${tag}-${testInfo.project.name}-${Date.now()}@cozycakes.test`;

async function signIn(page: Page, email: string) {
  const since = Date.now();
  await page.goto("/me");
  await expect(page.getByRole("heading", { level: 1, name: "Your cozy corner" })).toBeVisible();
  await page.getByLabel("Your email").fill(email);
  await page.getByRole("button", { name: "Email me a code" }).click();
  const form = page.getByRole("form", { name: "Enter your code" });
  await expect(form).toBeVisible();
  await form.getByLabel("6-digit code").fill(await latestCode(email, since));
  await form.getByRole("button", { name: "Sign in" }).click();
}

test("a guest saves their details from the order page, then reorders and checks out faster", async ({
  page,
}, testInfo) => {
  const email = customerEmail(testInfo, "guest");
  const order = await placePaidOrder(page.request, testInfo, {
    slot: 6,
    name: "Asha Menon",
    email,
  });

  // The order page offers an account, sending the code only to the email on the order.
  const since = Date.now();
  await page.goto(`/orders/${order.trackingToken}`);
  const save = page.getByRole("region", { name: "Order faster next time" });
  await save.getByRole("button", { name: "Save my details" }).click();
  await expect(save.getByText(/We sent a code to gu•+@cozycakes\.test/)).toBeVisible();
  await expect(save).not.toContainText(email);
  await save.getByLabel("6-digit code").fill(await latestCode(email, since));
  await save.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "Hello, Asha!" })).toBeVisible();
  await expect(page.getByText("Your details are saved")).toBeVisible();
  await expect(page.getByLabel("Mobile number")).toHaveValue("9876543210");
  await expect(page.getByLabel(`Open order ${order.orderNumber}`)).toBeVisible();
  await expectAccessible(page);

  // Signed in, the order page no longer offers to save details.
  await page.goto(`/orders/${order.trackingToken}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("region", { name: "Order faster next time" })).toHaveCount(0);

  // One tap puts the same cake back in the cart.
  await page.goto("/me");
  await page.getByRole("button", { name: `Order again: ${order.orderNumber}` }).click();
  const sheet = page.getByRole("dialog", { name: "Your cart" });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole("heading", { name: "Chocolate Truffle Dream" })).toBeVisible();

  // Checkout fills itself in.
  await page.goto("/checkout");
  await expect(page.getByLabel("Your name")).toHaveValue("Asha Menon");
  await expect(page.getByLabel(/^Email/)).toHaveValue(email);
  await expect(page.getByLabel(/^Mobile number/)).toHaveValue("9876543210");
});

test("a signed-in customer keeps favourites and saved addresses", async ({ page }, testInfo) => {
  const email = customerEmail(testInfo, "fav");
  await signIn(page, email);
  await expect(page.getByRole("heading", { level: 1, name: "Hello!" })).toBeVisible();

  // A heart on a cake page.
  await page.goto("/cakes/chocolate-truffle-dream");
  const heart = page.getByRole("button", { name: "Save Chocolate Truffle Dream to favourites" });
  await expect(heart).toHaveAttribute("aria-pressed", "false");
  await heart.click();
  await expect(heart).toHaveAttribute("aria-pressed", "true");

  await page.goto("/me");
  await expect(
    page.getByRole("region", { name: "Favourite cakes" }).getByText("Chocolate Truffle Dream"),
  ).toBeVisible();

  // A saved address.
  await page.getByRole("button", { name: "+ Add an address" }).click();
  const form = page.getByRole("form", { name: "Add an address" });
  await form.getByLabel("Name it (like Home)").fill("Home");
  await form.getByLabel("House and street").fill("12 MG Road");
  await form.getByLabel("City").fill("Bengaluru");
  await form.getByLabel("PIN code").fill("560099");
  await form.getByRole("button", { name: "Save address" }).click();
  const addresses = page.getByRole("region", { name: "Saved addresses" });
  await expect(addresses.getByText("12 MG Road, Bengaluru, 560099")).toBeVisible();
  await expectAccessible(page);

  // It's a one-tap choice at checkout.
  const line = await cartLine(page.request);
  await page.evaluate(
    (item) => localStorage.setItem("cozycakes.cart.v1", JSON.stringify([item])),
    line,
  );
  await page.goto("/checkout");
  await page.getByRole("radio", { name: /Delivery/ }).check({ force: true });
  await page.getByRole("button", { name: /Home, 560099/ }).click();
  await expect(page.getByLabel("Delivery PIN code")).toHaveValue("560099");
  await expect(page.getByText("I don’t deliver to 560099 yet.")).toBeVisible();
  await expect(page.getByLabel("Save this address for next time")).toBeChecked();

  // Removing it, and signing out.
  await page.goto("/me");
  await addresses.getByRole("button", { name: "Remove Home" }).click();
  await expect(addresses.getByText("12 MG Road")).toHaveCount(0);
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Your cozy corner" })).toBeVisible();
});

test("signed out, the account API and hearts ask the customer to sign in", async ({ page }) => {
  const me = await page.request.get("/api/v1/me");
  expect(me.status()).toBe(401);
  expect((await me.json()).error.code).toBe("SIGNED_OUT");

  await page.goto("/cakes/chocolate-truffle-dream");
  await page.getByRole("button", { name: "Sign in to save Chocolate Truffle Dream" }).click();
  await expect(page).toHaveURL(/\/me\?reason=favourite/);
  await expect(page.getByText("Sign in to keep your favourite cakes")).toBeVisible();
});
