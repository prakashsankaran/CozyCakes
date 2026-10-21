/**
 * Payment providers (research.md §6, tasks T060). Checkout talks to this interface so Razorpay can
 * be swapped for another provider. Card and UPI details never touch CozyCakes: the provider's
 * hosted checkout collects them and hands back a signed payment id (Principle IV).
 *
 * Uses `fetch` and Web Crypto only, so it runs on Node, edge runtimes and in tests.
 */

export type ProviderOrder = { orderId: string };
export type ProviderRefund = { refundId: string; status: string };

export interface PaymentProvider {
  readonly name: "razorpay" | "test";
  /** Registers the amount with the provider before the customer pays. */
  createOrder(input: {
    amount: number;
    currency: "INR";
    receipt: string;
    notes?: Record<string, string>;
  }): Promise<ProviderOrder>;
  /** Checks the signature the provider's checkout returned to the browser. */
  verifyPayment(input: { orderId: string; paymentId: string; signature: string }): Promise<boolean>;
  /** Checks a webhook body against its signature header. */
  verifyWebhook(rawBody: string, signature: string): Promise<boolean>;
  /** Returns `amount` of a captured payment to the customer (FR-024). */
  refund(input: {
    paymentId: string;
    amount: number;
    notes?: Record<string, string>;
  }): Promise<ProviderRefund>;
}

const encoder = new TextEncoder();

export async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(mac), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Compares without leaking where the strings differ. */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Razorpay signs `order_id|payment_id` with the key secret. */
export async function paymentSignature(secret: string, orderId: string, paymentId: string) {
  return hmacSha256Hex(secret, `${orderId}|${paymentId}`);
}

export class PaymentProviderError extends Error {}

export function razorpayProvider(config: {
  keyId: string;
  keySecret: string;
  webhookSecret?: string;
  fetch?: typeof fetch;
}): PaymentProvider {
  const doFetch = config.fetch ?? fetch;
  return {
    name: "razorpay",
    async createOrder({ amount, currency, receipt, notes }) {
      const res = await doFetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          authorization: `Basic ${btoa(`${config.keyId}:${config.keySecret}`)}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ amount, currency, receipt, notes, payment_capture: 1 }),
      });
      if (!res.ok) {
        throw new PaymentProviderError(`Razorpay refused the order: ${res.status}`);
      }
      const body = (await res.json()) as { id?: string };
      if (!body.id) throw new PaymentProviderError("Razorpay returned no order id");
      return { orderId: body.id };
    },
    async verifyPayment({ orderId, paymentId, signature }) {
      return timingSafeEqual(
        await paymentSignature(config.keySecret, orderId, paymentId),
        signature,
      );
    },
    async verifyWebhook(rawBody, signature) {
      if (!config.webhookSecret) return false;
      return timingSafeEqual(await hmacSha256Hex(config.webhookSecret, rawBody), signature);
    },
    async refund({ paymentId, amount, notes }) {
      const res = await doFetch(
        `https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}/refund`,
        {
          method: "POST",
          headers: {
            authorization: `Basic ${btoa(`${config.keyId}:${config.keySecret}`)}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({ amount, speed: "normal", notes }),
        },
      );
      if (!res.ok) {
        throw new PaymentProviderError(`Razorpay refused the refund: ${res.status}`);
      }
      const body = (await res.json()) as { id?: string; status?: string };
      if (!body.id) throw new PaymentProviderError("Razorpay returned no refund id");
      return { refundId: body.id, status: body.status ?? "pending" };
    },
  };
}

/**
 * A stand-in provider for automated tests: orders are local ids and "payments" are signed with a
 * test secret using Razorpay's scheme, so the confirmation path is the real one.
 */
export function testPaymentProvider(secret: string): PaymentProvider {
  return {
    name: "test",
    async createOrder({ receipt }) {
      return { orderId: `test_order_${receipt}` };
    },
    async verifyPayment({ orderId, paymentId, signature }) {
      return timingSafeEqual(await paymentSignature(secret, orderId, paymentId), signature);
    },
    async verifyWebhook(rawBody, signature) {
      return timingSafeEqual(await hmacSha256Hex(secret, rawBody), signature);
    },
    async refund({ paymentId }) {
      return { refundId: `test_refund_${paymentId}`, status: "processed" };
    },
  };
}
