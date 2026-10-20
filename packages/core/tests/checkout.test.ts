import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildCalendar, dayStatus, type AvailabilityRules } from "../src/availability";
import {
  CheckoutRequestSchema,
  normalizeIndianMobile,
  orderTotal,
  type CheckoutRequest,
} from "../src/schemas/checkout";
import {
  hmacSha256Hex,
  paymentSignature,
  razorpayProvider,
  testPaymentProvider,
} from "../src/payments";

const rules = (overrides: Partial<AvailabilityRules> = {}): AvailabilityRules => ({
  today: "2026-10-19", // a Monday
  leadTimeDays: 2,
  bookingWindowDays: 60,
  defaultDailyCapacity: 3,
  overrides: [],
  booked: {},
  ...overrides,
});

describe("availability calendar", () => {
  it("respects the lead time (US3 scenario 1)", () => {
    expect(dayStatus("2026-10-19", rules()).status).toBe("too_soon"); // Monday
    expect(dayStatus("2026-10-20", rules()).status).toBe("too_soon"); // Tuesday
    expect(dayStatus("2026-10-21", rules())).toEqual({
      date: "2026-10-21",
      status: "available",
      remaining: 3,
    });
  });

  it("marks a day full once orders and holds reach capacity (US5 scenario 2)", () => {
    const r = rules({ booked: { "2026-10-25": 3, "2026-10-26": 2 } });
    expect(dayStatus("2026-10-25", r).status).toBe("full");
    expect(dayStatus("2026-10-26", r)).toMatchObject({ status: "available", remaining: 1 });
  });

  it("applies the baker's days off and capacity changes", () => {
    const r = rules({
      overrides: [
        { date: "2026-10-24", blocked: true, capacityOverride: null },
        { date: "2026-10-25", blocked: false, capacityOverride: 1 },
        { date: "2026-10-26", blocked: false, capacityOverride: 0 },
      ],
      booked: { "2026-10-25": 1 },
    });
    expect(dayStatus("2026-10-24", r).status).toBe("blocked");
    expect(dayStatus("2026-10-25", r).status).toBe("full");
    expect(dayStatus("2026-10-26", r).status).toBe("blocked");
  });

  it("stops at the end of the booking window", () => {
    const days = buildCalendar(rules({ bookingWindowDays: 10 }));
    expect(days).toHaveLength(11);
    expect(days[0]!.date).toBe("2026-10-19");
    expect(days.at(-1)!.date).toBe("2026-10-29");
    expect(dayStatus("2026-10-30", rules({ bookingWindowDays: 10 })).status).toBe("blocked");
  });
});

describe("checkout details", () => {
  const request = (overrides: Partial<CheckoutRequest> = {}): CheckoutRequest => ({
    items: [
      {
        id: "line-1",
        cakeId: "c1",
        sizeId: "s1",
        optionIds: [],
        message: "",
        referencePhoto: null,
        quantity: 1,
      },
    ],
    fulfilment: "pickup",
    date: "2026-10-22",
    slotId: "6f1c7d1e-2c49-4b53-9a59-0c6a3f8b9e10",
    contact: { name: "Ananya", email: "ananya@example.com", phone: "98765 43210" },
    address: null,
    note: "",
    ...overrides,
  });

  it("accepts a pickup order and tidies the phone number", () => {
    const parsed = CheckoutRequestSchema.parse(request());
    expect(parsed.contact.phone).toBe("+919876543210");
  });

  it("needs an address for delivery", () => {
    const result = CheckoutRequestSchema.safeParse(request({ fulfilment: "delivery" }));
    expect(result.error?.issues[0]?.message).toBe("Add the delivery address");
  });

  it("checks PIN codes and phone numbers", () => {
    const address = { line1: "12 MG Road", city: "Bengaluru", postalCode: "056001" };
    const bad = CheckoutRequestSchema.safeParse(
      request({ fulfilment: "delivery", address, contact: { ...request().contact, phone: "123" } }),
    );
    expect(bad.error?.issues.map((i) => i.message).sort()).toEqual([
      "Enter a 10-digit mobile number",
      "Enter a 6-digit PIN code",
    ]);
  });

  it.each([
    ["9876543210", "+919876543210"],
    ["+91 98765-43210", "+919876543210"],
    ["098765 43210", "+919876543210"],
    ["9123456789", "+919123456789"],
    ["5876543210", null],
    ["98765", null],
  ])("normalizes %s", (input, expected) => {
    expect(normalizeIndianMobile(input)).toBe(expected);
  });

  it("adds the delivery fee and never discounts below zero", () => {
    expect(orderTotal(140000, 5000)).toBe(145000);
    expect(orderTotal(1000, 0, 5000)).toBe(0);
  });
});

describe("payment signatures", () => {
  it("matches Node's HMAC-SHA256", async () => {
    const expected = createHmac("sha256", "secret").update("order_1|pay_1").digest("hex");
    expect(await hmacSha256Hex("secret", "order_1|pay_1")).toBe(expected);
    expect(await paymentSignature("secret", "order_1", "pay_1")).toBe(expected);
  });

  it("verifies Razorpay checkout and webhook signatures", async () => {
    const provider = razorpayProvider({ keyId: "rzp", keySecret: "key", webhookSecret: "hook" });
    const good = await paymentSignature("key", "order_1", "pay_1");
    expect(
      await provider.verifyPayment({ orderId: "order_1", paymentId: "pay_1", signature: good }),
    ).toBe(true);
    expect(
      await provider.verifyPayment({ orderId: "order_2", paymentId: "pay_1", signature: good }),
    ).toBe(false);
    const body = '{"event":"payment.captured"}';
    expect(await provider.verifyWebhook(body, await hmacSha256Hex("hook", body))).toBe(true);
    expect(await provider.verifyWebhook(body, await hmacSha256Hex("key", body))).toBe(false);
  });

  it("creates Razorpay orders with the amount in paise", async () => {
    let sent: { url: string; body: unknown; auth: string | null } | undefined;
    const provider = razorpayProvider({
      keyId: "rzp_test",
      keySecret: "secret",
      fetch: async (url, init) => {
        sent = {
          url: String(url),
          body: JSON.parse(String(init?.body)),
          auth: new Headers(init?.headers).get("authorization"),
        };
        return Response.json({ id: "order_abc" });
      },
    });
    const order = await provider.createOrder({ amount: 145000, currency: "INR", receipt: "c1" });
    expect(order).toEqual({ orderId: "order_abc" });
    expect(sent?.url).toBe("https://api.razorpay.com/v1/orders");
    expect(sent?.body).toMatchObject({ amount: 145000, currency: "INR", receipt: "c1" });
    expect(sent?.auth).toBe(`Basic ${btoa("rzp_test:secret")}`);
  });

  it("the test provider signs like Razorpay", async () => {
    const provider = testPaymentProvider("test-secret");
    const { orderId } = await provider.createOrder({ amount: 1, currency: "INR", receipt: "c9" });
    const signature = await paymentSignature("test-secret", orderId, "pay_9");
    expect(await provider.verifyPayment({ orderId, paymentId: "pay_9", signature })).toBe(true);
  });
});
