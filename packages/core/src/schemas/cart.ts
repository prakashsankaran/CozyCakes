import { z } from "zod";

/**
 * Cart shapes (data-model.md "Cart", contracts/api-v1.md `POST /cart/quote`). The cart lives on
 * the device and is never trusted: the server re-prices every item on each quote.
 */

/** FR-008: messages piped on the cake. Counted like the browser counts `maxLength`. */
export const CAKE_MESSAGE_MAX = 40;
export const MAX_QUANTITY = 5;
export const MAX_CART_ITEMS = 20;

/** FR-008: reference photos are common image formats up to 10 MB. */
export const REFERENCE_PHOTO_MAX_BYTES = 10 * 1024 * 1024;
export const REFERENCE_PHOTO_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
] as const;

export const CakeConfigSchema = z.object({
  cakeId: z.string().min(1),
  sizeId: z.string().min(1),
  optionIds: z.array(z.string().min(1)).max(30),
  message: z.string().max(CAKE_MESSAGE_MAX),
  referencePhoto: z
    .object({ uploadId: z.string().min(1), url: z.url() })
    .nullable()
    .default(null),
  quantity: z.number().int().min(1).max(MAX_QUANTITY),
});
export type CakeConfig = z.infer<typeof CakeConfigSchema>;

export const CartItemSchema = CakeConfigSchema.extend({
  /** Device-generated line id, so a line can be edited or removed. */
  id: z.string().min(1).max(64),
});
export type CartItem = z.infer<typeof CartItemSchema>;

export const CartQuoteRequestSchema = z.object({
  items: z.array(CartItemSchema).max(MAX_CART_ITEMS),
});
export type CartQuoteRequest = z.infer<typeof CartQuoteRequestSchema>;

export const QuoteLineSchema = z.object({
  itemId: z.string(),
  /** `invalid`: some choices are no longer offered; `unavailable`: the cake can't be ordered. */
  status: z.enum(["ok", "invalid", "unavailable"]),
  cakeSlug: z.string().nullable(),
  cakeName: z.string().nullable(),
  sizeLabel: z.string().nullable(),
  choices: z.array(z.string()),
  message: z.string(),
  unitPrice: z.number().int().nonnegative(),
  quantity: z.number().int().positive(),
  lineTotal: z.number().int().nonnegative(),
  issues: z.array(z.string()),
});
export type QuoteLine = z.infer<typeof QuoteLineSchema>;

export const CartQuoteSchema = z.object({
  lines: z.array(QuoteLineSchema),
  /** Sum of `ok` lines only; other lines must be fixed or removed before checkout. */
  subtotal: z.number().int().nonnegative(),
  itemCount: z.number().int().nonnegative(),
  /** Longest lead time among `ok` lines and the date it allows, or null for an empty cart. */
  leadTimeDays: z.number().int().nonnegative().nullable(),
  earliestDate: z.string().nullable(),
});
export type CartQuote = z.infer<typeof CartQuoteSchema>;

export const ReferenceUploadRequestSchema = z.object({
  mime: z.enum(REFERENCE_PHOTO_TYPES),
  bytes: z.number().int().positive().max(REFERENCE_PHOTO_MAX_BYTES),
});
export type ReferenceUploadRequest = z.infer<typeof ReferenceUploadRequestSchema>;

export const ReferenceUploadSchema = z.object({
  referenceUploadId: z.string(),
  /** Where the browser POSTs the file as multipart form data, with `fields` alongside. */
  uploadUrl: z.url(),
  fields: z.record(z.string(), z.string()),
  /** Final image URL once the upload succeeds. */
  url: z.url(),
});
export type ReferenceUpload = z.infer<typeof ReferenceUploadSchema>;
