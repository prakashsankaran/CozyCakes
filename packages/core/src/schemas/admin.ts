import { z } from "zod";
import { isCalendarDate } from "../dates";
import { PhotoSchema } from "./catalog";
import { UPI_ID_PATTERN } from "../payments";

/**
 * Back-office inputs (US5, FR-021/FR-022). The web back office and the future `/api/v1/admin/*`
 * endpoints validate with these same schemas. Money is integer minor units (paise).
 */

export const CakeStatusSchema = z.enum(["draft", "visible", "paused", "archived"]);
export type CakeStatus = z.infer<typeof CakeStatusSchema>;

export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** URL-friendly name: "Pistachio & Rose!" → "pistachio-rose". */
export function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

/** Parses a rupee amount as typed by the owner ("1,400", "₹750.50") into paise, or null. */
export function rupeesToPaise(input: string): number | null {
  const cleaned = input.replace(/[₹,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Math.round(Number(cleaned) * 100);
}

export const SizeInputSchema = z.object({
  /** Present when editing an existing size, so carts that reference it keep working. */
  id: z.uuid().optional(),
  label: z.string().trim().min(1, "Give the size a name").max(30),
  serves: z.string().trim().min(1, "Say how many it serves").max(30),
  price: z.number().int().positive("Prices must be more than ₹0"),
  active: z.boolean(),
});
export type SizeInput = z.infer<typeof SizeInputSchema>;

export const CakeInputSchema = z
  .object({
    name: z.string().trim().min(1, "Give the cake a name").max(80),
    slug: z.string().regex(SLUG, "Use lowercase letters, numbers and dashes").max(60),
    tagline: z.string().trim().max(140),
    story: z.string().trim().max(1200),
    leadTimeDays: z.number().int().min(0).max(30),
    status: CakeStatusSchema,
    featured: z.boolean(),
    occasionTags: z.array(z.string()).max(20),
    dietaryTags: z.array(z.string()).max(20),
    flavourTags: z.array(z.string()).max(20),
    photos: z.array(PhotoSchema).max(8),
    sizes: z.array(SizeInputSchema).max(10),
    /** Option groups the cake offers, in builder order. */
    optionGroupIds: z.array(z.uuid()).max(10),
  })
  .refine((c) => c.status !== "visible" || c.sizes.some((s) => s.active), {
    message: "A cake on the menu needs at least one size customers can pick",
    path: ["sizes"],
  });
export type CakeInput = z.infer<typeof CakeInputSchema>;

export const OptionInputSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1, "Give the choice a name").max(60),
  priceDelta: z.number().int().min(0),
  swatch: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullable(),
  active: z.boolean(),
});
export type OptionInput = z.infer<typeof OptionInputSchema>;

export const OptionGroupInputSchema = z
  .object({
    id: z.uuid().optional(),
    name: z.string().trim().min(1, "Give the group a name").max(40),
    kind: z.enum(["single", "multi"]),
    required: z.boolean(),
    maxSelect: z.number().int().min(1).max(20).nullable(),
    options: z.array(OptionInputSchema).max(30),
  })
  .refine((g) => g.kind === "multi" || g.maxSelect === null, {
    message: "Only pick-several groups have a maximum",
    path: ["maxSelect"],
  });
export type OptionGroupInput = z.infer<typeof OptionGroupInputSchema>;

export const BakerySettingsInputSchema = z.object({
  defaultDailyCapacity: z.number().int().min(1).max(50),
  bookingWindowDays: z.number().int().min(7).max(180),
  pickupAddress: z.string().trim().max(300),
  pickupInstructions: z.string().trim().max(300),
});
export type BakerySettingsInput = z.infer<typeof BakerySettingsInputSchema>;

/** Where customers pay by UPI when there's no payment gateway (research.md §6). */
export const UpiSettingsInputSchema = z.object({
  /** Empty switches UPI checkout off. */
  upiId: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || UPI_ID_PATTERN.test(v),
      "That doesn't look like a UPI ID (name@bank)",
    ),
  /** The name customers see in their UPI app. */
  upiName: z.string().trim().max(60),
});
export type UpiSettingsInput = z.infer<typeof UpiSettingsInputSchema>;

export const DayAvailabilityInputSchema = z.object({
  date: z.string().refine(isCalendarDate, "Pick a valid date"),
  blocked: z.boolean(),
  capacityOverride: z.number().int().min(0).max(50).nullable(),
  note: z.string().trim().max(120),
});
export type DayAvailabilityInput = z.infer<typeof DayAvailabilityInputSchema>;

export const StaffRoleSchema = z.enum(["staff", "owner"]);
export type StaffRole = z.infer<typeof StaffRoleSchema>;
