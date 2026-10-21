import { expect, type APIRequestContext, type TestInfo } from "@playwright/test";
import {
  CartItemSchema,
  type Availability,
  type CakeDetail,
  type CheckoutRequest,
} from "@cozycakes/core";

// Shared shopping steps for end-to-end tests. Relies on the development seed: Chocolate Truffle
// Dream is ₹1,400 for 1 kg, 2 days' notice.

const CAKE = "chocolate-truffle-dream";

/** A 1 kg cake with the first choice of every required group, as a cart line. */
export async function cartLine(request: APIRequestContext) {
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

/**
 * Places and pays for a pickup order through the API, on the `slot`-th open day (different per
 * browser project, so parallel tests don't fill each other's dates).
 */
export async function placePaidOrder(
  request: APIRequestContext,
  testInfo: TestInfo,
  input: { slot: number; name: string; email: string },
) {
  const item = CartItemSchema.parse(await cartLine(request));
  const availability = (await (
    await request.get("/api/v1/availability?lead_days=2")
  ).json()) as Availability;
  const open = availability.days.filter((d) => d.status === "available");
  const n = input.slot * 2 + (testInfo.project.name === "phone" ? 0 : 1);
  const day = open[Math.min(open.length - 1, n)]!;
  const created = await request.post("/api/v1/checkouts", {
    data: {
      items: [item],
      fulfilment: "pickup",
      date: day.date,
      slotId: availability.slots[0]!.id,
      contact: { name: input.name, email: input.email, phone: "9876543210" },
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
  const paid = await request.post(`/api/v1/checkouts/${checkoutId}/payment`, { data: result });
  expect(paid.status()).toBe(200);
  return (await paid.json()) as { orderNumber: string; trackingToken: string };
}
