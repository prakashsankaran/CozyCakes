import { expect, test } from "@playwright/test";
import { expectAccessible } from "./a11y";

// FR-031: contact and policy pages, linked from every shop page (Razorpay reviews them).

const pages = [
  ["Contact", "Say hello"],
  ["Delivery and pickup", "Delivery and pickup"],
  ["Cancellations and refunds", "Cancellations and refunds"],
  ["Terms", "Terms"],
  ["Privacy", "Privacy"],
] as const;

for (const [link, heading] of pages) {
  test(`the footer leads to ${link}`, async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("navigation", { name: "Good to know" })
      .getByRole("link", { name: link })
      .click();
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    await expect(page.getByText(/^Last updated /)).toBeVisible();
    await expectAccessible(page);
  });
}

test("the refunds page explains cancelling and links to contact", async ({ page }) => {
  await page.goto("/refunds");
  await expect(page.getByText("More than 48 hours before your date:")).toBeVisible();
  await page
    .getByRole("navigation", { name: "More about ordering" })
    .getByRole("link", { name: "Contact" })
    .click();
  await expect(page.getByRole("link", { name: "@cosycaker" }).first()).toBeVisible();
});
