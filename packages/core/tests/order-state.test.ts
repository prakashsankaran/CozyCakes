import { describe, expect, it } from "vitest";
import {
  CancelOrderInputSchema,
  ORDER_STATUSES,
  canMoveOrder,
  isFinalStatus,
  nextStatus,
  notifiesCustomer,
  orderJourney,
  type OrderStatus,
} from "../src/orders";
import { razorpayProvider, testPaymentProvider } from "../src/payments";

describe("order state machine", () => {
  it("walks a delivery order to Delivered", () => {
    let status: OrderStatus = "confirmed";
    const seen: OrderStatus[] = [status];
    while (nextStatus(status, "delivery")) {
      status = nextStatus(status, "delivery")!;
      seen.push(status);
    }
    expect(seen).toEqual(orderJourney("delivery"));
    expect(seen.at(-1)).toBe("delivered");
  });

  it("sends pickup orders to Ready to collect, never Out for delivery", () => {
    expect(nextStatus("ready", "pickup")).toBe("ready_for_pickup");
    expect(canMoveOrder("ready", "out_for_delivery", "pickup")).toBe(false);
    expect(canMoveOrder("ready", "ready_for_pickup", "delivery")).toBe(false);
    expect(orderJourney("pickup").at(-1)).toBe("collected");
  });

  it("only moves one step forward", () => {
    expect(canMoveOrder("confirmed", "baking", "pickup")).toBe(true);
    expect(canMoveOrder("confirmed", "ready", "pickup")).toBe(false);
    expect(canMoveOrder("ready", "baking", "pickup")).toBe(false);
  });

  it("cancels from any unfinished status, and finished orders stay put", () => {
    for (const status of ORDER_STATUSES) {
      expect(canMoveOrder(status, "cancelled", "delivery")).toBe(!isFinalStatus(status));
    }
    expect(isFinalStatus("delivered")).toBe(true);
    expect(isFinalStatus("collected")).toBe(true);
    expect(isFinalStatus("cancelled")).toBe(true);
    expect(nextStatus("cancelled", "pickup")).toBeNull();
  });

  it("notifies the customer from Ready onwards and on cancellation (FR-019)", () => {
    expect(ORDER_STATUSES.filter(notifiesCustomer)).toEqual([
      "ready",
      "out_for_delivery",
      "ready_for_pickup",
      "delivered",
      "collected",
      "cancelled",
    ]);
  });

  it("needs a reason to cancel", () => {
    const orderId = "6f9619ff-8b86-4d11-b42d-00c04fc964ff";
    expect(CancelOrderInputSchema.safeParse({ orderId, reason: "  " }).success).toBe(false);
    expect(CancelOrderInputSchema.parse({ orderId, reason: " Oven broke " }).reason).toBe(
      "Oven broke",
    );
  });
});

describe("refunds", () => {
  it("asks Razorpay to refund the payment", async () => {
    let sent: { url: string; body: unknown } | undefined;
    const provider = razorpayProvider({
      keyId: "rzp_test",
      keySecret: "secret",
      fetch: async (url, init) => {
        sent = { url: String(url), body: JSON.parse(String(init?.body)) };
        return Response.json({ id: "rfnd_1", status: "processed" });
      },
    });
    const refund = await provider.refund({ paymentId: "pay_1", amount: 140000 });
    expect(refund).toEqual({ refundId: "rfnd_1", status: "processed" });
    expect(sent?.url).toBe("https://api.razorpay.com/v1/payments/pay_1/refund");
    expect(sent?.body).toMatchObject({ amount: 140000 });
  });

  it("reports a refused refund", async () => {
    const provider = razorpayProvider({
      keyId: "rzp_test",
      keySecret: "secret",
      fetch: async () => new Response("nope", { status: 400 }),
    });
    await expect(provider.refund({ paymentId: "pay_1", amount: 1 })).rejects.toThrow(
      /refused the refund/,
    );
  });

  it("the test provider refunds instantly", async () => {
    expect(await testPaymentProvider("s").refund({ paymentId: "pay_2", amount: 1 })).toEqual({
      refundId: "test_refund_pay_2",
      status: "processed",
    });
  });
});
