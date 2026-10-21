import { razorpayProvider, testPaymentProvider, type PaymentProvider } from "@cozycakes/core";

/**
 * Which payment provider checkout uses (research.md §6). Online checkout switches on only when
 * Razorpay keys are set, so the live site keeps sending carts to Instagram until then.
 * `PAYMENT_PROVIDER=test` swaps in a fake provider for automated tests; it is refused on Vercel
 * production.
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

export function checkoutEnabled() {
  return paymentProvider() !== null;
}
