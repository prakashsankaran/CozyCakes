import { z } from "zod";
import { isCalendarDate } from "../dates";
import { CartItemSchema, MAX_CART_ITEMS } from "./cart";

/**
 * Checkout shapes (FR-010 to FR-016, contracts/api-v1.md "Availability & delivery" and
 * "Checkout & payment"). Money is integer minor units (paise).
 */

export const NOTE_TO_BAKER_MAX = 500;
/** How long a checkout holds its date while the customer pays (research.md §7). */
export const CHECKOUT_HOLD_MINUTES = 15;

/** Indian PIN codes: six digits, never starting with 0. */
export const PostalCodeSchema = z
  .string()
  .trim()
  .regex(/^[1-9]\d{5}$/, "Enter a 6-digit PIN code");

/** "98765 43210", "+91 98765-43210" or "098765 43210" all become "+919876543210". */
export function normalizeIndianMobile(input: string): string | null {
  const digits = input.replace(/[\s\-().]/g, "").replace(/^(\+91|0091|91(?=\d{10}$)|0)/, "");
  return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : null;
}

export const ContactSchema = z.object({
  name: z.string().trim().min(1, "Tell us your name").max(80),
  email: z.email("Enter an email address we can send your confirmation to"),
  phone: z.string().transform((value, ctx) => {
    const phone = normalizeIndianMobile(value);
    if (!phone) {
      ctx.addIssue({ code: "custom", message: "Enter a 10-digit mobile number" });
      return z.NEVER;
    }
    return phone;
  }),
});
export type Contact = z.infer<typeof ContactSchema>;

export const AddressSchema = z.object({
  line1: z.string().trim().min(1, "Enter the house and street").max(120),
  line2: z.string().trim().max(120).default(""),
  landmark: z.string().trim().max(80).default(""),
  city: z.string().trim().min(1, "Enter the city").max(60),
  postalCode: PostalCodeSchema,
});
export type Address = z.infer<typeof AddressSchema>;

export const FulfilmentSchema = z.enum(["delivery", "pickup"]);
export type Fulfilment = z.infer<typeof FulfilmentSchema>;

export const CheckoutRequestSchema = z
  .object({
    items: z.array(CartItemSchema).min(1, "Your cart is empty").max(MAX_CART_ITEMS),
    fulfilment: FulfilmentSchema,
    date: z.string().refine(isCalendarDate, "Pick a date"),
    slotId: z.uuid("Pick a time"),
    contact: ContactSchema,
    address: AddressSchema.nullable(),
    note: z.string().trim().max(NOTE_TO_BAKER_MAX).default(""),
    /** Optional discount code (FR-017); re-checked on the server. */
    discountCode: z.string().max(40).nullish().default(null),
  })
  .refine((c) => c.fulfilment === "pickup" || c.address !== null, {
    message: "Add the delivery address",
    path: ["address"],
  });
export type CheckoutRequest = z.input<typeof CheckoutRequestSchema>;
export type ParsedCheckoutRequest = z.output<typeof CheckoutRequestSchema>;

export const CalendarDaySchema = z.object({
  date: z.string(),
  status: z.enum(["available", "full", "blocked", "too_soon"]),
  remaining: z.number().int().nonnegative(),
});

export const TimeSlotSchema = z.object({
  id: z.string(),
  label: z.string(),
  fulfilment: z.enum(["delivery", "pickup", "both"]),
});
export type TimeSlot = z.infer<typeof TimeSlotSchema>;

/** `GET /api/v1/availability` */
export const AvailabilitySchema = z.object({
  timeZone: z.string(),
  today: z.string(),
  leadTimeDays: z.number().int().nonnegative(),
  days: z.array(CalendarDaySchema),
  slots: z.array(TimeSlotSchema),
  pickup: z.object({ address: z.string(), instructions: z.string() }),
});
export type Availability = z.infer<typeof AvailabilitySchema>;

/** `GET /api/v1/delivery/check` */
export const DeliveryCheckSchema = z.object({
  postalCode: z.string(),
  available: z.boolean(),
  fee: z.number().int().nonnegative().nullable(),
});
export type DeliveryCheck = z.infer<typeof DeliveryCheckSchema>;

/** What the browser needs to collect payment for a checkout. */
export const PaymentParamsSchema = z.discriminatedUnion("provider", [
  z.object({ provider: z.literal("razorpay"), keyId: z.string(), orderId: z.string() }),
  /** Fake provider for automated tests; never available on the live site. */
  z.object({ provider: z.literal("test"), orderId: z.string() }),
  /** UPI paid by hand: the order already exists, awaiting payment; its page shows how to pay. */
  z.object({ provider: z.literal("upi"), orderNumber: z.string(), trackingToken: z.string() }),
]);
export type PaymentParams = z.infer<typeof PaymentParamsSchema>;

/** `POST /api/v1/checkouts` */
export const CheckoutCreatedSchema = z.object({
  checkoutId: z.string(),
  amount: z.number().int().positive(),
  currency: z.literal("INR"),
  expiresAt: z.string(),
  payment: PaymentParamsSchema,
});
export type CheckoutCreated = z.infer<typeof CheckoutCreatedSchema>;

/** `POST /api/v1/orders/track/{token}/paid`: the customer says they've paid by UPI. */
export const UpiPaidClaimSchema = z.object({
  /** The 12-digit UPI reference (UTR) from their app, to help the baker find the payment. */
  reference: z
    .string()
    .trim()
    .transform((v) => v.replace(/\s+/g, ""))
    .refine((v) => v === "" || /^\d{12}$/.test(v), "A UPI reference is 12 digits")
    .default(""),
});

/** `POST /api/v1/checkouts/{id}/payment`: what the payment provider handed the browser. */
export const PaymentResultSchema = z.object({
  providerOrderId: z.string().min(1).max(100),
  providerPaymentId: z.string().min(1).max(100),
  signature: z.string().min(1).max(200),
});
export type PaymentResult = z.infer<typeof PaymentResultSchema>;

/** `GET /api/v1/checkouts/{id}` */
export const CheckoutStatusSchema = z.object({
  status: z.enum(["open", "paid", "expired", "failed"]),
  orderNumber: z.string().nullable(),
  trackingToken: z.string().nullable(),
});
export type CheckoutStatus = z.infer<typeof CheckoutStatusSchema>;

/** One priced line, frozen when payment starts and copied onto the order. */
export const OrderLineSnapshotSchema = z.object({
  cakeId: z.string(),
  cakeName: z.string(),
  sizeLabel: z.string(),
  options: z.array(z.object({ name: z.string(), priceDelta: z.number().int() })),
  message: z.string(),
  referencePhotoUrl: z.string().nullable(),
  unitPrice: z.number().int(),
  quantity: z.number().int(),
  lineTotal: z.number().int(),
});
export type OrderLineSnapshot = z.infer<typeof OrderLineSnapshotSchema>;

export const CheckoutSnapshotSchema = z.object({
  lines: z.array(OrderLineSnapshotSchema),
  fulfilment: FulfilmentSchema,
  date: z.string(),
  slotId: z.string(),
  slotLabel: z.string(),
  contact: z.object({ name: z.string(), email: z.string(), phone: z.string() }),
  address: AddressSchema.nullable(),
  note: z.string(),
  subtotal: z.number().int(),
  deliveryFee: z.number().int(),
  discount: z.number().int(),
  /** The code that gave the discount, if any. Older snapshots don't have these. */
  discountCode: z.string().nullish(),
  discountCodeId: z.string().nullish(),
  total: z.number().int(),
});
export type CheckoutSnapshot = z.infer<typeof CheckoutSnapshotSchema>;

/** Order total (data-model.md "Pricing rule"); the discount never exceeds the subtotal. */
export function orderTotal(subtotal: number, deliveryFee: number, discount = 0): number {
  return subtotal + deliveryFee - Math.min(discount, subtotal);
}

/** Back office: a PIN code the baker delivers to, and its fee (FR-012). */
export const DeliveryZoneInputSchema = z.object({
  postalCode: PostalCodeSchema,
  fee: z.number().int().min(0, "The fee can't be negative"),
  active: z.boolean(),
});
export type DeliveryZoneInput = z.infer<typeof DeliveryZoneInputSchema>;

/** "16:00" → "4pm", "10:30" → "10:30am", "12:00" → "12pm". */
export function formatClockTime(time: string): string {
  const [h = 0, m = 0] = time.split(":").map(Number);
  const hour = h % 12 || 12;
  return `${hour}${m ? `:${String(m).padStart(2, "0")}` : ""}${h < 12 ? "am" : "pm"}`;
}

/** What customers see for a time slot, like "10am – 12pm". */
export const slotLabel = (start: string, end: string) =>
  `${formatClockTime(start)} – ${formatClockTime(end)}`;

const ClockTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Pick a time");

/** Back office: a pickup or delivery time customers can choose (tasks T085). */
export const TimeSlotInputSchema = z
  .object({
    start: ClockTimeSchema,
    end: ClockTimeSchema,
    fulfilment: z.enum(["delivery", "pickup", "both"]),
  })
  .refine((s) => s.start < s.end, {
    message: "The end time must be after the start time",
    path: ["end"],
  });
export type TimeSlotInput = z.input<typeof TimeSlotInputSchema>;
