import { z } from "zod";
import { isCalendarDate, type CalendarDate } from "./dates";
import { formatMoney } from "./money";
import { CartItemSchema, MAX_CART_ITEMS } from "./schemas/cart";

/**
 * Discount codes (FR-017, data-model.md "DiscountCode" and "Pricing rule"). The baker creates
 * them in the back office; customers type one at checkout. Shared so the web checkout, the server
 * and a future mobile app agree on what a code is worth and why one doesn't work.
 */

export const DISCOUNT_CODE_PATTERN = /^[A-Z0-9]{3,20}$/;

/** Codes are matched without caring about case or stray spaces: " cake10 " is CAKE10. */
export function normalizeDiscountCode(input: string): string {
  return input.replace(/\s+/g, "").toUpperCase();
}

export type DiscountType = "percent" | "fixed";

export type DiscountRule = {
  code: string;
  type: DiscountType;
  /** Percent: 1–100. Fixed: paise off. */
  value: number;
  minSubtotal: number;
  startsOn: CalendarDate | null;
  endsOn: CalendarDate | null;
  maxRedemptions: number | null;
  redemptions: number;
  active: boolean;
};

/** What the code takes off this subtotal (never more than the subtotal). */
export function discountAmount(rule: Pick<DiscountRule, "type" | "value">, subtotal: number) {
  const off = rule.type === "percent" ? Math.floor((subtotal * rule.value) / 100) : rule.value;
  return Math.max(0, Math.min(off, subtotal));
}

/** "10% off" or "₹200 off", for labels and emails. */
export function describeDiscount(rule: Pick<DiscountRule, "type" | "value">): string {
  return rule.type === "percent" ? `${rule.value}% off` : `${formatMoney(rule.value)} off`;
}

export type DiscountCheck =
  | { ok: true; code: string; amount: number; description: string }
  | { ok: false; reason: DiscountProblem; message: string };

export type DiscountProblem =
  "unknown" | "paused" | "not_started" | "expired" | "used_up" | "min_subtotal";

/** Whether `rule` (null when no such code) works for this subtotal today, and how much it takes off. */
export function checkDiscount(
  rule: DiscountRule | null,
  input: { subtotal: number; today: CalendarDate },
): DiscountCheck {
  const fail = (reason: DiscountProblem, message: string): DiscountCheck => ({
    ok: false,
    reason,
    message,
  });
  if (!rule) return fail("unknown", "That code doesn't exist. Check the spelling?");
  if (!rule.active) return fail("paused", `${rule.code} isn't working right now.`);
  if (rule.startsOn && input.today < rule.startsOn) {
    return fail("not_started", `${rule.code} starts a little later. Try again soon!`);
  }
  if (rule.endsOn && input.today > rule.endsOn) {
    return fail("expired", `${rule.code} has ended. Keep an eye out for the next one.`);
  }
  if (rule.maxRedemptions !== null && rule.redemptions >= rule.maxRedemptions) {
    return fail("used_up", `${rule.code} has been used up.`);
  }
  if (input.subtotal < rule.minSubtotal) {
    return fail(
      "min_subtotal",
      `${rule.code} works on orders of ${formatMoney(rule.minSubtotal)} or more.`,
    );
  }
  return {
    ok: true,
    code: rule.code,
    amount: discountAmount(rule, input.subtotal),
    description: describeDiscount(rule),
  };
}

const optionalDate = z
  .string()
  .trim()
  .transform((v) => v || null)
  .refine((v) => v === null || isCalendarDate(v), "Pick a date")
  .nullable();

/** Back office: create or edit a code. */
export const DiscountCodeInputSchema = z
  .object({
    code: z
      .string()
      .transform(normalizeDiscountCode)
      .refine((v) => DISCOUNT_CODE_PATTERN.test(v), "Use 3 to 20 letters or numbers, like CAKE10"),
    type: z.enum(["percent", "fixed"]),
    value: z.number().int("Use a whole number").positive("Enter how much it takes off"),
    minSubtotal: z.number().int().min(0, "The minimum can't be negative"),
    startsOn: optionalDate,
    endsOn: optionalDate,
    maxRedemptions: z.number().int().positive("Allow at least one use").nullable(),
    active: z.boolean(),
  })
  .refine((d) => d.type === "fixed" || d.value <= 100, {
    message: "A percentage can't be more than 100",
    path: ["value"],
  })
  .refine((d) => !d.startsOn || !d.endsOn || d.startsOn <= d.endsOn, {
    message: "The last day must be on or after the first day",
    path: ["endsOn"],
  });
export type DiscountCodeInput = z.input<typeof DiscountCodeInputSchema>;
export type ParsedDiscountCodeInput = z.output<typeof DiscountCodeInputSchema>;

/** `POST /api/v1/discounts/check` body. */
export const DiscountCheckRequestSchema = z.object({
  code: z.string().min(1, "Enter a code").max(40),
  items: z.array(CartItemSchema).min(1, "Your cart is empty").max(MAX_CART_ITEMS),
});

/** `POST /api/v1/discounts/check`: the code's worth on this cart, before paying. */
export const DiscountQuoteSchema = z.object({
  code: z.string(),
  amount: z.number().int().nonnegative(),
  description: z.string(),
});
export type DiscountQuote = z.infer<typeof DiscountQuoteSchema>;
