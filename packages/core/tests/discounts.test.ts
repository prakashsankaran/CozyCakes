import { describe, expect, it } from "vitest";
import {
  DiscountCodeInputSchema,
  checkDiscount,
  discountAmount,
  normalizeDiscountCode,
  type DiscountRule,
} from "../src/discounts";
import { CheckoutRequestSchema, orderTotal } from "../src/schemas/checkout";

const rule = (overrides: Partial<DiscountRule> = {}): DiscountRule => ({
  code: "CAKE10",
  type: "percent",
  value: 10,
  minSubtotal: 0,
  startsOn: null,
  endsOn: null,
  maxRedemptions: null,
  redemptions: 0,
  active: true,
  ...overrides,
});

const today = "2026-10-21";

describe("discount amounts (data-model.md pricing rule)", () => {
  it("rounds percentages down to the paisa", () => {
    expect(discountAmount({ type: "percent", value: 10 }, 140_000)).toBe(14_000);
    expect(discountAmount({ type: "percent", value: 15 }, 99_99)).toBe(1_499);
  });

  it("never takes off more than the cakes cost", () => {
    expect(discountAmount({ type: "fixed", value: 50_000 }, 30_000)).toBe(30_000);
    expect(orderTotal(30_000, 8_000, 30_000)).toBe(8_000);
  });
});

describe("checking a code", () => {
  it("works when active, in its dates, under its limit and over the minimum", () => {
    expect(
      checkDiscount(rule({ startsOn: today, endsOn: today, maxRedemptions: 5, redemptions: 4 }), {
        subtotal: 140_000,
        today,
      }),
    ).toEqual({ ok: true, code: "CAKE10", amount: 14_000, description: "10% off" });
  });

  it.each([
    [null, "unknown"],
    [rule({ active: false }), "paused"],
    [rule({ startsOn: "2026-10-22" }), "not_started"],
    [rule({ endsOn: "2026-10-20" }), "expired"],
    [rule({ maxRedemptions: 3, redemptions: 3 }), "used_up"],
    [rule({ minSubtotal: 200_000 }), "min_subtotal"],
  ] as const)("refuses %# with a reason", (r, reason) => {
    const result = checkDiscount(r, { subtotal: 140_000, today });
    expect(result).toMatchObject({ ok: false, reason });
  });

  it("explains the minimum in rupees", () => {
    const result = checkDiscount(rule({ minSubtotal: 200_000 }), { subtotal: 1, today });
    expect(result.ok || result.message).toBe("CAKE10 works on orders of ₹2,000 or more.");
  });

  it("ignores case and spaces", () => {
    expect(normalizeDiscountCode(" cake 10 ")).toBe("CAKE10");
  });
});

describe("back-office input", () => {
  const input = {
    code: "diwali25",
    type: "percent" as const,
    value: 25,
    minSubtotal: 0,
    startsOn: "",
    endsOn: "",
    maxRedemptions: null,
    active: true,
  };

  it("normalises the code and empty dates", () => {
    expect(DiscountCodeInputSchema.parse(input)).toMatchObject({
      code: "DIWALI25",
      startsOn: null,
      endsOn: null,
    });
  });

  it("refuses odd codes, big percentages and back-to-front dates", () => {
    expect(DiscountCodeInputSchema.safeParse({ ...input, code: "no!" }).success).toBe(false);
    expect(DiscountCodeInputSchema.safeParse({ ...input, value: 120 }).success).toBe(false);
    expect(
      DiscountCodeInputSchema.safeParse({ ...input, startsOn: "2026-11-02", endsOn: "2026-11-01" })
        .success,
    ).toBe(false);
    expect(
      DiscountCodeInputSchema.safeParse({ ...input, type: "fixed", value: 50_000 }).success,
    ).toBe(true);
  });
});

describe("checkout request", () => {
  it("treats the discount code as optional", () => {
    const parsed = CheckoutRequestSchema.safeParse({
      items: [
        {
          id: "l1",
          cakeId: "6f9619ff-8b86-4d11-b42d-00c04fc964ff",
          sizeId: "6f9619ff-8b86-4d11-b42d-00c04fc964fe",
          optionIds: [],
          message: "",
          referencePhoto: null,
          quantity: 1,
        },
      ],
      fulfilment: "pickup",
      date: "2026-10-25",
      slotId: "6f9619ff-8b86-4d11-b42d-00c04fc964fd",
      contact: { name: "A", email: "a@example.com", phone: "9876543210" },
      address: null,
    });
    expect(parsed.success && parsed.data.discountCode).toBe(null);
  });
});
