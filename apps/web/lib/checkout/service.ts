import { connection } from "next/server";
import {
  addDays,
  buildCalendar,
  checkDiscount,
  normalizeDiscountCode,
  orderTotal,
  todayIn,
  type Availability,
  type CartItem,
  type CheckoutCreated,
  type CheckoutSnapshot,
  type CheckoutStatus,
  type DeliveryCheck,
  type DiscountQuote,
  type ParsedCheckoutRequest,
  type PaymentResult,
} from "@cozycakes/core";
import {
  checkoutRepository,
  CheckoutNotFoundError,
  DateUnavailableError,
  discountsRepository,
  getDb,
} from "@cozycakes/db";
import { priceCartForOrder } from "@/lib/catalog";
import { sendOrderEmails } from "./notify";
import { paymentProvider } from "./payments";

/**
 * Checkout (US3): availability, delivery checks, starting a payment and confirming it. Shared by
 * the `/api/v1` handlers so the web checkout and a future mobile app follow the same rules.
 */

export class CheckoutError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

const repo = () => checkoutRepository(getDb());

export async function getAvailability(leadTimeDays: number): Promise<Availability> {
  await connection();
  const { timeZone, bookingWindowDays } = await repo().rules();
  const today = todayIn(timeZone);
  const { bakery, overrides, booked, slots } = await repo().availability(
    today,
    addDays(today, bookingWindowDays),
  );
  return {
    timeZone,
    today,
    leadTimeDays,
    days: buildCalendar({
      today,
      leadTimeDays,
      bookingWindowDays: bakery.bookingWindowDays,
      defaultDailyCapacity: bakery.defaultDailyCapacity,
      overrides,
      booked,
    }),
    slots,
    pickup: { address: bakery.pickupAddress, instructions: bakery.pickupInstructions },
  };
}

export async function checkDelivery(postalCode: string): Promise<DeliveryCheck> {
  const fee = await repo().deliveryFee(postalCode);
  return { postalCode, available: fee !== null, fee };
}

/** Checks a typed code against this subtotal today; throws `DISCOUNT_INVALID` with why not. */
async function applyDiscount(code: string, subtotal: number) {
  const normalized = normalizeDiscountCode(code);
  const rule = normalized ? await discountsRepository(getDb()).find(normalized) : null;
  const { timeZone } = await repo().rules();
  const result = checkDiscount(rule, { subtotal, today: todayIn(timeZone) });
  if (!result.ok) {
    throw new CheckoutError(400, "DISCOUNT_INVALID", result.message, { reason: result.reason });
  }
  return { ...result, id: rule!.id };
}

/** What a code takes off this cart, before paying (contracts: POST /discounts/check). */
export async function quoteDiscount(code: string, items: CartItem[]): Promise<DiscountQuote> {
  const { quote } = await priceCartForOrder(items);
  const { code: applied, amount, description } = await applyDiscount(code, quote.subtotal);
  return { code: applied, amount, description };
}

const DATE_MESSAGES = {
  full: "That day just filled up. Please pick another date.",
  blocked: "I'm not baking that day. Please pick another date.",
  too_soon: "That day is too soon for these cakes. Please pick a later date.",
} as const;

/** Re-prices the cart, holds the date and registers the payment (contracts: POST /checkouts). */
export async function startCheckout(request: ParsedCheckoutRequest): Promise<CheckoutCreated> {
  const provider = paymentProvider();
  if (!provider) {
    throw new CheckoutError(503, "CHECKOUT_UNAVAILABLE", "Online checkout isn't switched on yet");
  }

  const { quote, lines } = await priceCartForOrder(request.items);
  const problems = quote.lines.flatMap((l) => l.issues);
  if (problems.length || lines.length === 0) {
    throw new CheckoutError(400, "CART_CHANGED", "Some cakes in your cart need attention", {
      issues: problems,
    });
  }

  const slot = await repo().findSlot(request.slotId);
  if (!slot || (slot.fulfilment !== "both" && slot.fulfilment !== request.fulfilment)) {
    throw new CheckoutError(400, "INVALID_SLOT", "Please pick a time again");
  }

  let deliveryFee = 0;
  if (request.fulfilment === "delivery") {
    const fee = await repo().deliveryFee(request.address!.postalCode);
    if (fee === null) {
      throw new CheckoutError(
        400,
        "NOT_DELIVERABLE",
        "I don't deliver to that PIN code yet. You can pick your cake up instead.",
      );
    }
    deliveryFee = fee;
  }

  const discount = request.discountCode
    ? await applyDiscount(request.discountCode, quote.subtotal)
    : null;

  const snapshot: CheckoutSnapshot = {
    lines,
    fulfilment: request.fulfilment,
    date: request.date,
    slotId: slot.id,
    slotLabel: slot.label,
    contact: request.contact,
    address: request.fulfilment === "delivery" ? request.address : null,
    note: request.note,
    subtotal: quote.subtotal,
    deliveryFee,
    discount: discount?.amount ?? 0,
    discountCode: discount?.code ?? null,
    discountCodeId: discount?.id ?? null,
    total: orderTotal(quote.subtotal, deliveryFee, discount?.amount ?? 0),
  };

  const { timeZone } = await repo().rules();
  let opened: { checkoutId: string; expiresAt: Date };
  try {
    opened = await repo().openCheckout({
      snapshot,
      today: todayIn(timeZone),
      leadTimeDays: quote.leadTimeDays ?? 0,
    });
  } catch (error) {
    if (error instanceof DateUnavailableError) {
      throw new CheckoutError(409, "DATE_FULL", DATE_MESSAGES[error.status], {
        status: error.status,
      });
    }
    throw error;
  }

  let providerOrderId: string;
  try {
    ({ orderId: providerOrderId } = await provider.createOrder({
      amount: snapshot.total,
      currency: "INR",
      receipt: opened.checkoutId,
      notes: { date: snapshot.date, fulfilment: snapshot.fulfilment },
    }));
    await repo().attachProviderOrder(opened.checkoutId, providerOrderId);
  } catch (error) {
    console.error(error);
    await repo().abandonCheckout(opened.checkoutId);
    throw new CheckoutError(502, "PAYMENT_UNAVAILABLE", "Payments are having a moment. Try again.");
  }

  return {
    checkoutId: opened.checkoutId,
    amount: snapshot.total,
    currency: "INR",
    expiresAt: opened.expiresAt.toISOString(),
    payment:
      provider.name === "razorpay"
        ? { provider: "razorpay", keyId: process.env.RAZORPAY_KEY_ID!, orderId: providerOrderId }
        : { provider: "test", orderId: providerOrderId },
  };
}

export async function getCheckoutStatus(checkoutId: string): Promise<CheckoutStatus | null> {
  return repo().checkoutStatus(checkoutId);
}

/**
 * Confirms a payment the browser reports, after checking the provider's signature (FR-015). The
 * provider's webhook does the same independently, so a closed tab still gets its order.
 */
export async function completePayment(
  checkoutId: string,
  result: PaymentResult,
  origin: string,
): Promise<CheckoutStatus> {
  const provider = paymentProvider();
  if (!provider) {
    throw new CheckoutError(503, "CHECKOUT_UNAVAILABLE", "Online checkout isn't switched on yet");
  }
  const checkout = await repo().checkout(checkoutId);
  if (!checkout || checkout.paymentProviderOrderId !== result.providerOrderId) {
    throw new CheckoutError(404, "CHECKOUT_NOT_FOUND", "We couldn't find that checkout");
  }
  const verified = await provider.verifyPayment({
    orderId: result.providerOrderId,
    paymentId: result.providerPaymentId,
    signature: result.signature,
  });
  if (!verified) {
    throw new CheckoutError(400, "PAYMENT_NOT_VERIFIED", "We couldn't verify that payment");
  }
  const order = await repo().confirmPayment({
    provider: provider.name,
    providerOrderId: result.providerOrderId,
    providerPaymentId: result.providerPaymentId,
    amount: null,
  });
  if (order.created) await sendOrderEmails(order, origin);
  return { status: "paid", orderNumber: order.number, trackingToken: order.trackingToken };
}

type RazorpayEvent = {
  event?: string;
  payload?: { payment?: { entity?: { id?: string; order_id?: string; amount?: number } } };
};

/** Razorpay webhook (T063): signed, idempotent, and the safety net for closed tabs. */
export async function handlePaymentWebhook(rawBody: string, signature: string, origin: string) {
  const provider = paymentProvider();
  if (!provider || !(await provider.verifyWebhook(rawBody, signature))) {
    throw new CheckoutError(400, "INVALID_SIGNATURE", "Signature mismatch");
  }
  const event = JSON.parse(rawBody) as RazorpayEvent;
  if (event.event !== "payment.captured" && event.event !== "order.paid") return;
  const payment = event.payload?.payment?.entity;
  if (!payment?.id || !payment.order_id) return;
  try {
    const order = await repo().confirmPayment({
      provider: provider.name,
      providerOrderId: payment.order_id,
      providerPaymentId: payment.id,
      amount: payment.amount ?? null,
      rawEvent: event,
    });
    if (order.created) await sendOrderEmails(order, origin);
  } catch (error) {
    // Payments for orders made elsewhere (e.g. payment links) aren't ours to confirm.
    if (error instanceof CheckoutNotFoundError) return;
    throw error;
  }
}

/** The private order page: the order plus where to collect it (FR-016, FR-018). */
export async function getOrderByTrackingToken(token: string) {
  await connection();
  const [order, bakery] = await Promise.all([repo().orderByTrackingToken(token), repo().rules()]);
  return order
    ? { order, pickup: { address: bakery.pickupAddress, instructions: bakery.pickupInstructions } }
    : null;
}
