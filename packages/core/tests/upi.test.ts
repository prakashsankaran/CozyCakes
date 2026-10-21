import { describe, expect, it } from "vitest";
import { MoveOrderInputSchema, canMoveOrder, nextStatus, notifiesCustomer } from "../src/orders";
import { UPI_ID_PATTERN, upiPaymentLink } from "../src/payments";
import { UpiSettingsInputSchema } from "../src/schemas/admin";
import { UpiPaidClaimSchema } from "../src/schemas/checkout";

// UPI paid by hand (research.md §6): no gateway, the baker confirms the money arrived.

describe("UPI orders", () => {
  it("wait for payment, then join the usual journey at Confirmed", () => {
    expect(nextStatus("awaiting_payment", "pickup")).toBe("confirmed");
    expect(canMoveOrder("awaiting_payment", "baking", "pickup")).toBe(false);
    expect(canMoveOrder("awaiting_payment", "cancelled", "delivery")).toBe(true);
    expect(notifiesCustomer("awaiting_payment")).toBe(false);
  });

  it("let the kitchen mark a payment received, but never move an order back to unpaid", () => {
    const orderId = "6f9619ff-8b86-4d11-b42d-00c04fc964ff";
    expect(MoveOrderInputSchema.safeParse({ orderId, to: "confirmed" }).success).toBe(true);
    expect(MoveOrderInputSchema.safeParse({ orderId, to: "awaiting_payment" }).success).toBe(false);
  });

  it("builds a upi://pay link with the amount in rupees and the order as the note", () => {
    const link = upiPaymentLink({
      upiId: "cozy.cakes@okicici",
      payeeName: "Cozy Cakes",
      amount: 140050,
      note: "CozyCakes CC-1042",
    });
    expect(link).toBe(
      "upi://pay?pa=cozy.cakes%40okicici&pn=Cozy%20Cakes&am=1400.50&cu=INR&tn=CozyCakes%20CC-1042",
    );
  });

  it("accepts real-looking UPI IDs only", () => {
    for (const ok of ["cozycakes@okicici", "98765.43210@ybl", "a_b-c@paytm"]) {
      expect(UPI_ID_PATTERN.test(ok)).toBe(true);
    }
    for (const bad of ["cozycakes", "@ybl", "name@", "na me@ybl", "name@1bank"]) {
      expect(UPI_ID_PATTERN.test(bad)).toBe(false);
    }
    expect(UpiSettingsInputSchema.parse({ upiId: " cozy@ybl ", upiName: "" }).upiId).toBe(
      "cozy@ybl",
    );
    expect(UpiSettingsInputSchema.safeParse({ upiId: "", upiName: "" }).success).toBe(true);
    expect(UpiSettingsInputSchema.safeParse({ upiId: "cozy", upiName: "" }).success).toBe(false);
  });

  it("takes an optional 12-digit UPI reference when the customer says they've paid", () => {
    expect(UpiPaidClaimSchema.parse({}).reference).toBe("");
    expect(UpiPaidClaimSchema.parse({ reference: " 1234 5678 9012 " }).reference).toBe(
      "123456789012",
    );
    expect(UpiPaidClaimSchema.safeParse({ reference: "12345" }).success).toBe(false);
  });
});
