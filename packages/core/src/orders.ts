import { z } from "zod";

/**
 * The order status flow (data-model.md "Order state machine", FR-018, FR-019, FR-023, FR-024).
 * Shared by the back office, the customer's order page and a future mobile app, so every surface
 * agrees on which moves are allowed and what each status means to the customer.
 */

export const ORDER_STATUSES = [
  "awaiting_payment",
  "confirmed",
  "baking",
  "ready",
  "out_for_delivery",
  "ready_for_pickup",
  "delivered",
  "collected",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type OrderFulfilment = "delivery" | "pickup";
/**
 * Statuses an order moves forward into. A paid order starts at Confirmed; a UPI order starts at
 * Awaiting payment and moves to Confirmed when the baker sees the money. Cancelled is separate.
 */
export type ForwardStatus = Exclude<OrderStatus, "awaiting_payment" | "cancelled">;

const FINAL: ReadonlySet<OrderStatus> = new Set(["delivered", "collected", "cancelled"]);

export function isFinalStatus(status: OrderStatus): boolean {
  return FINAL.has(status);
}

/** The next step forward from `status`, or null once the order is finished. */
export function nextStatus(status: OrderStatus, fulfilment: OrderFulfilment): ForwardStatus | null {
  switch (status) {
    case "awaiting_payment":
      return "confirmed";
    case "confirmed":
      return "baking";
    case "baking":
      return "ready";
    case "ready":
      return fulfilment === "delivery" ? "out_for_delivery" : "ready_for_pickup";
    case "out_for_delivery":
      return "delivered";
    case "ready_for_pickup":
      return "collected";
    default:
      return null;
  }
}

/** Orders only move one step forward, or to Cancelled from any unfinished status. */
export function canMoveOrder(
  from: OrderStatus,
  to: OrderStatus,
  fulfilment: OrderFulfilment,
): boolean {
  if (isFinalStatus(from)) return false;
  return to === "cancelled" || nextStatus(from, fulfilment) === to;
}

/**
 * The customer hears about these moves (FR-019). Confirmed is told separately: reaching it from
 * Awaiting payment sends the full order confirmation.
 */
export function notifiesCustomer(status: OrderStatus): boolean {
  return status !== "awaiting_payment" && status !== "confirmed" && status !== "baking";
}

/** The happy path shown as the order's timeline. */
export function orderJourney(fulfilment: OrderFulfilment): OrderStatus[] {
  return fulfilment === "delivery"
    ? ["confirmed", "baking", "ready", "out_for_delivery", "delivered"]
    : ["confirmed", "baking", "ready", "ready_for_pickup", "collected"];
}

/** Words for each status: a short label, the customer's line, and the baker's button. */
export const ORDER_STATUS_COPY: Record<
  OrderStatus,
  { label: string; customer: string; action: string }
> = {
  awaiting_payment: {
    label: "Awaiting payment",
    customer: "Your date is held. Pay by UPI and I'll confirm your order.",
    action: "Hold for payment",
  },
  confirmed: {
    label: "Confirmed",
    customer: "Your cake is booked into my baking diary.",
    action: "Payment received",
  },
  baking: {
    label: "Baking",
    customer: "Your cake is in the oven. The kitchen smells wonderful.",
    action: "Start baking",
  },
  ready: {
    label: "Ready",
    customer: "Your cake is finished, decorated and boxed.",
    action: "Mark as ready",
  },
  out_for_delivery: {
    label: "Out for delivery",
    customer: "Your cake is on its way to you.",
    action: "Send out for delivery",
  },
  ready_for_pickup: {
    label: "Ready to collect",
    customer: "Your cake is waiting for you to collect.",
    action: "Ready to collect",
  },
  delivered: {
    label: "Delivered",
    customer: "Your cake has arrived. Enjoy every slice!",
    action: "Mark as delivered",
  },
  collected: {
    label: "Collected",
    customer: "You picked up your cake. Enjoy every slice!",
    action: "Mark as collected",
  },
  cancelled: {
    label: "Cancelled",
    customer: "This order was cancelled.",
    action: "Cancel order",
  },
};

export const ORDER_CANCEL_REASON_MAX = 300;

export const OrderStatusSchema = z.enum(ORDER_STATUSES);

/** Back office: move an order one step forward ("confirmed" marks a UPI payment received). */
export const MoveOrderInputSchema = z.object({
  orderId: z.uuid(),
  to: OrderStatusSchema.exclude(["awaiting_payment", "cancelled"]),
});
export type MoveOrderInput = z.infer<typeof MoveOrderInputSchema>;

/** Back office: cancel with a reason the customer will read (FR-024). */
export const CancelOrderInputSchema = z.object({
  orderId: z.uuid(),
  reason: z
    .string()
    .trim()
    .min(1, "Tell the customer why")
    .max(ORDER_CANCEL_REASON_MAX, "Keep the reason under 300 characters"),
});
export type CancelOrderInput = z.infer<typeof CancelOrderInputSchema>;

/** `GET /api/v1/orders/track/{token}`: what the private order link shows (FR-018). */
export const TrackedOrderSchema = z.object({
  number: z.string(),
  status: OrderStatusSchema,
  fulfilment: z.enum(["delivery", "pickup"]),
  date: z.string(),
  slotLabel: z.string(),
  contactName: z.string(),
  address: z
    .object({
      line1: z.string(),
      line2: z.string().optional(),
      landmark: z.string().optional(),
      city: z.string(),
      postalCode: z.string(),
    })
    .nullable(),
  pickup: z.object({ address: z.string(), instructions: z.string() }).nullable(),
  cancelReason: z.string().nullable(),
  items: z.array(
    z.object({
      cakeName: z.string(),
      sizeLabel: z.string(),
      options: z.array(z.object({ name: z.string(), priceDelta: z.number().int() })),
      message: z.string(),
      quantity: z.number().int(),
      lineTotal: z.number().int(),
    }),
  ),
  subtotal: z.number().int(),
  deliveryFee: z.number().int(),
  discount: z.number().int(),
  total: z.number().int(),
  /** Each status the order has reached, oldest first. */
  timeline: z.array(z.object({ status: OrderStatusSchema, at: z.string() })),
  /** How to pay, while a UPI order is awaiting payment (otherwise null). */
  upi: z
    .object({
      upiId: z.string(),
      payeeName: z.string(),
      /** `upi://pay?...` link with the amount and order number filled in. */
      link: z.string(),
      /** When the date is released if the customer hasn't said they've paid. */
      payBy: z.string(),
      /** The customer said they've paid; the baker is checking. */
      claimed: z.boolean(),
    })
    .nullable(),
});
export type TrackedOrder = z.infer<typeof TrackedOrderSchema>;
