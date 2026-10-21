import { headers } from "next/headers";
import { razorpayProvider, testPaymentProvider, type PaymentProvider } from "@cozycakes/core";
import { checkoutRepository, getDb } from "@cozycakes/db";

/**
 * Which payment provider checkout uses (research.md §6). Online checkout switches on when Razorpay
 * keys are set, or else when the baker adds a UPI ID to be paid into by hand; until then the live
 * site keeps sending carts to Instagram. `PAYMENT_PROVIDER=test` swaps in a fake provider for
 * automated tests; it is refused on Vercel production.
 */

/** Signs fake payments in tests. Not a secret: the test provider never runs in production. */
export const TEST_PAYMENT_SECRET = "cozycakes-test-payments";

export function testPaymentsEnabled() {
  return process.env.PAYMENT_PROVIDER === "test" && process.env.VERCEL_ENV !== "production";
}

export function paymentProvider(): PaymentProvider | null {
  if (testPaymentsEnabled()) return testPaymentProvider(TEST_PAYMENT_SECRET);
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  return razorpayProvider({ keyId, keySecret, webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET });
}

export type CheckoutMethod = "razorpay" | "test" | "upi";

/** Lets an end-to-end test try UPI checkout while the test provider is on. */
export const TEST_PAYMENTS_OFF_HEADER = "x-cozycakes-test-payments";

/** How customers pay right now, or null when checkout is off. */
export async function checkoutMethod(): Promise<CheckoutMethod | null> {
  const provider = paymentProvider();
  if (provider?.name === "test" && (await headers()).get(TEST_PAYMENTS_OFF_HEADER) !== "off") {
    return "test";
  }
  if (provider?.name === "razorpay") return "razorpay";
  const { upiId } = await checkoutRepository(getDb()).rules();
  return upiId ? "upi" : null;
}
