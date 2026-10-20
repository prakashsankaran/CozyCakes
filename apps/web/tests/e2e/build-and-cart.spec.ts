import { expect, test, type Page } from "@playwright/test";
import { expectAccessible } from "./a11y";

// US2: Personalise a cake and add it to the cart. Relies on the development seed (pnpm db:seed):
// Chocolate Truffle Dream is ₹1,400 for 1 kg and ₹750 for 0.5 kg, and the topper is ₹150.

/** Choice cards are labels wrapping visually hidden inputs, so click the card itself. */
async function choose(page: Page, name: RegExp) {
  await page.locator("label").filter({ hasText: name }).click();
}

async function next(page: Page, step: string) {
  await page.getByRole("button", { name: `Next: ${step}` }).click();
}

const livePrice = (page: Page) => page.getByTestId("live-price");
const sheet = (page: Page) => page.getByRole("dialog", { name: "Your cart" });

test("build a cake, see the live price, and keep it in the cart", async ({ page }) => {
  await page.goto("/cakes/chocolate-truffle-dream");
  const builder = page.getByRole("region", { name: "Build your cake" });

  // Nothing picked yet: adding nudges towards the size.
  await builder.getByRole("button", { name: "Add to cart" }).click();
  await expect(builder.getByRole("alert")).toHaveText("Pick a size");

  await choose(page, /^1 kg/);
  await expect(page.getByRole("radio", { name: /^1 kg/ })).toBeChecked();
  await expect(livePrice(page)).toHaveText("₹1,400");

  await next(page, "Frosting");
  await choose(page, /^Whipped cream/);
  await next(page, "Dietary");
  await choose(page, /^Make it eggless/);
  await next(page, "Add-ons");
  await choose(page, /^Happy Birthday topper/);
  // US2 scenario 1: 1 kg price plus the topper, without a reload.
  await expect(livePrice(page)).toHaveText("₹1,550");

  await next(page, "Message");
  await page.getByLabel(/Message on the cake/).fill("Happy birthday Mia");
  await expect(page.getByRole("img", { name: "Preview of your cake" })).toContainText(
    "Happy birthday Mia",
  );
  await expectAccessible(page);

  await builder.getByRole("button", { name: "Add to cart" }).click();
  const cart = sheet(page);
  await expect(cart).toBeVisible();
  await expect(cart.getByRole("heading", { name: "Chocolate Truffle Dream" })).toBeVisible();
  await expect(
    cart.getByText("1 kg · Whipped cream · Make it eggless · Happy Birthday topper"),
  ).toBeVisible();
  await expect(cart.getByText("“Happy birthday Mia”")).toBeVisible();
  await expect(cart.getByTestId("cart-subtotal")).toHaveText("₹1,550");
  await expect(cart.getByText(/Ready from/)).toBeVisible();
  await expectAccessible(page);

  await cart.getByRole("button", { name: "One more" }).click();
  await expect(cart.getByTestId("cart-subtotal")).toHaveText("₹3,100");
  await cart.getByRole("button", { name: "Close cart" }).click();
  await expect(cart).toBeHidden();

  // US2 scenario 4: the cart survives a reload on the same device.
  await page.goto("/cart");
  await expect(page.getByRole("heading", { name: "Chocolate Truffle Dream" })).toBeVisible();
  await expect(page.getByTestId("cart-subtotal")).toHaveText("₹3,100");

  // US2 scenario 5: editing returns to the builder with the previous choices.
  await page.getByRole("link", { name: "Edit Chocolate Truffle Dream" }).click();
  await expect(page).toHaveURL(/\/cakes\/chocolate-truffle-dream\?edit=/);
  await expect(page.getByRole("heading", { name: "Edit your cake" })).toBeVisible();
  await expect(page.getByRole("radio", { name: /^1 kg/ })).toBeChecked();
  await expect(livePrice(page)).toHaveText("₹3,100");
  await choose(page, /^0\.5 kg/);
  await expect(livePrice(page)).toHaveText("₹1,800");
  await page.getByRole("button", { name: "Update cake" }).click();

  await expect(sheet(page).getByRole("listitem")).toHaveCount(1);
  await expect(sheet(page).getByTestId("cart-subtotal")).toHaveText("₹1,800");
  await expect(sheet(page).getByText(/^0\.5 kg ·/)).toBeVisible();

  await sheet(page).getByRole("button", { name: "Remove Chocolate Truffle Dream" }).click();
  await expect(sheet(page).getByText("Your cart is empty")).toBeVisible();
});

test("the cake message stops at 40 characters with a live count", async ({ page }) => {
  await page.goto("/cakes/vanilla-cloud");
  await page.getByRole("button", { name: /^Message/ }).click();
  const message = page.getByLabel(/Message on the cake/);
  await message.pressSequentially("x".repeat(45));
  await expect(message).toHaveValue("x".repeat(40));
  await expect(page.getByText(/^40\/40 characters/)).toBeVisible();
});

test("reference photos get friendly errors and can be retried", async ({ page }) => {
  await page.goto("/cakes/your-theme-cake");
  const builder = page.getByRole("region", { name: "Build your cake" });
  await builder.getByRole("button", { name: /^Photo/ }).click();
  const input = builder.locator('input[type="file"]');

  await input.setInputFiles({
    name: "ideas.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4"),
  });
  await expect(builder.getByRole("alert")).toContainText("isn't a photo we can use");

  await input.setInputFiles({
    name: "huge.png",
    mimeType: "image/png",
    buffer: Buffer.alloc(12 * 1024 * 1024),
  });
  await expect(builder.getByRole("alert")).toContainText("under 10 MB");

  // A good photo goes straight to Cloudinary (stubbed here) and replaces the error.
  await page.route("https://api.cloudinary.com/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" }),
  );
  await input.setInputFiles({
    name: "unicorn.png",
    mimeType: "image/png",
    buffer: Buffer.from("not really a png, but small"),
  });
  await expect(builder.getByRole("button", { name: "Remove photo" })).toBeVisible();
  await expect(builder.getByRole("alert")).toHaveCount(0);
});

test("cart quote API re-prices items and flags unknown cakes", async ({ request }) => {
  const cake = await (await request.get("/api/v1/cakes/chocolate-truffle-dream")).json();
  const oneKg = cake.sizes.find((s: { label: string }) => s.label === "1 kg");
  const options = cake.optionGroups.flatMap(
    (g: { options: Array<{ id: string; name: string }> }) => g.options,
  );
  const pick = (name: string) => options.find((o: { name: string }) => o.name === name).id;

  const res = await request.post("/api/v1/cart/quote", {
    data: {
      items: [
        {
          id: "a",
          cakeId: cake.id,
          sizeId: oneKg.id,
          optionIds: [pick("Whipped cream"), pick("Happy Birthday topper")],
          message: "",
          quantity: 2,
        },
        {
          id: "b",
          cakeId: "00000000-0000-0000-0000-000000000000",
          sizeId: "x",
          optionIds: [],
          message: "",
          quantity: 1,
        },
      ],
    },
  });
  expect(res.ok()).toBe(true);
  const quote = await res.json();
  expect(quote.lines.map((l: { status: string }) => l.status)).toEqual(["ok", "unavailable"]);
  expect(quote.lines[0].unitPrice).toBe(155000);
  expect(quote.subtotal).toBe(310000);
  expect(quote.leadTimeDays).toBe(2);

  const bad = await request.post("/api/v1/cart/quote", { data: { items: [{ id: "a" }] } });
  expect(bad.status()).toBe(400);
  expect((await bad.json()).error.code).toBe("INVALID_CART");
});
