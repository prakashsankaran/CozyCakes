import { expect, test } from "@playwright/test";
import { expectAccessible } from "./a11y";

// US1: Discover cakes and feel the brand. Relies on the development seed (pnpm db:seed).

test("home page tells the story and reaches a cake in one tap", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Baked slowly.");
  await expect(page.getByRole("heading", { name: "What are we celebrating?" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Birthdays/ })).toBeVisible();
  await expectAccessible(page);

  const firstFeatured = page
    .getByRole("region", { name: /favourites/ })
    .getByRole("listitem")
    .first()
    .getByRole("link");
  const name = (await firstFeatured.getByRole("heading").textContent())!;
  await firstFeatured.click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
});

test("filters combine occasion and dietary needs", async ({ page }) => {
  await page.goto("/cakes");
  await expect(page.getByRole("heading", { name: "Red Velvet Romance" })).toBeVisible();

  await page.getByRole("link", { name: "Dietary: Eggless" }).click();
  await page.getByRole("link", { name: "Occasion: Birthdays" }).click();
  await expect(page).toHaveURL(/occasion=birthday/);
  await expect(page).toHaveURL(/dietary=eggless/);

  await expect(page.getByRole("heading", { name: "Chocolate Truffle Dream" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Red Velvet Romance" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Pistachio Rose" })).toHaveCount(0);
  await expectAccessible(page);
});

test("a filter with no matches shows a friendly empty state", async ({ page }) => {
  await page.goto("/cakes?occasion=wedding");
  await expect(page.getByRole("heading", { name: /Nothing in the mixing bowl/ })).toBeVisible();
  await page.getByRole("link", { name: "Show all cakes" }).click();
  await expect(page).toHaveURL(/\/cakes$/);
});

test("cake detail shows sizes, earliest date and options", async ({ page }) => {
  await page.goto("/cakes/chocolate-truffle-dream");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Chocolate Truffle Dream");
  await expect(page.getByText(/Ready from .* order 2 days ahead/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sizes" })).toBeVisible();
  await expect(page.getByText("Serves 8–10")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Make it yours" })).toBeVisible();
  await expectAccessible(page);
});

test("paused cakes are marked Back soon and cannot be ordered", async ({ page }) => {
  await page.goto("/cakes/fresh-mango-delight");
  await expect(page.getByText("Back soon").first()).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "This one is taking a little break" }),
  ).toBeVisible();
  await expect(page.getByText(/Ready from/)).toHaveCount(0);
});

test("unknown cakes show the branded not-found page", async ({ page }) => {
  await page.goto("/cakes/not-a-real-cake");
  await expect(page.getByRole("heading", { name: /someone ate this page/ })).toBeVisible();
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("entrance animations are effectively disabled", async ({ page }) => {
    await page.goto("/");
    const duration = await page
      .locator(".animate-rise")
      .first()
      .evaluate((el) => parseFloat(getComputedStyle(el).animationDuration));
    expect(duration).toBeLessThan(0.01);
  });
});

test("catalog API returns contract-shaped, filtered data", async ({ request }) => {
  const res = await request.get("/api/v1/cakes?dietary=eggless");
  expect(res.ok()).toBe(true);
  const { cakes } = (await res.json()) as { cakes: Array<{ dietaryTags: string[]; slug: string }> };
  expect(cakes.length).toBeGreaterThan(0);
  for (const cake of cakes) expect(cake.dietaryTags).toContain("eggless");

  const missing = await request.get("/api/v1/cakes/nope");
  expect(missing.status()).toBe(404);
  expect((await missing.json()).error.code).toBe("CAKE_NOT_FOUND");
});
