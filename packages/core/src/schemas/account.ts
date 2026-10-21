import { z } from "zod";
import { OrderStatusSchema } from "../orders";
import { AddressSchema } from "./checkout";
import { CartItemSchema } from "./cart";

/**
 * Customer accounts (US6, FR-027, contracts/api-v1.md "Orders (customer)"). Shared by the web
 * account screens and the `/api/v1/me` endpoints a mobile app will use.
 */

export const ADDRESS_LABEL_MAX = 30;

/** A delivery address the customer saves for next time ("Home", "Mum's"). */
export const SavedAddressInputSchema = AddressSchema.extend({
  label: z.string().trim().max(ADDRESS_LABEL_MAX).default(""),
});
export type SavedAddressInput = z.input<typeof SavedAddressInputSchema>;

export const SavedAddressSchema = z.object({
  id: z.string(),
  label: z.string(),
  line1: z.string(),
  line2: z.string(),
  landmark: z.string(),
  city: z.string(),
  postalCode: z.string(),
});
export type SavedAddress = z.infer<typeof SavedAddressSchema>;

/** `GET /api/v1/me`: who is signed in, for pre-filling checkout. */
export const MeSchema = z.object({
  email: z.string(),
  name: z.string(),
  phone: z.string(),
  addresses: z.array(SavedAddressSchema),
});
export type Me = z.infer<typeof MeSchema>;

/** `GET /api/v1/me/orders`: one past or current order. */
export const MyOrderSchema = z.object({
  id: z.string(),
  number: z.string(),
  status: OrderStatusSchema,
  fulfilment: z.enum(["delivery", "pickup"]),
  date: z.string(),
  total: z.number().int(),
  trackingToken: z.string(),
  items: z.array(z.object({ cakeName: z.string(), sizeLabel: z.string(), quantity: z.number() })),
});
export type MyOrder = z.infer<typeof MyOrderSchema>;

/** `POST /api/v1/me/orders/{id}/reorder`: today's cart lines for a past order. */
export const ReorderSchema = z.object({
  /** Cart lines with what the customer will see, ready for the device cart. */
  items: z.array(
    CartItemSchema.omit({ id: true }).extend({
      snapshot: z.object({
        cakeSlug: z.string(),
        cakeName: z.string(),
        sizeLabel: z.string(),
        choices: z.array(z.string()),
        unitPrice: z.number().int().nonnegative(),
      }),
    }),
  ),
  /** Cakes from that order that can't be made the same way any more. */
  skipped: z.array(z.string()),
});
export type Reorder = z.infer<typeof ReorderSchema>;

export const FavouriteInputSchema = z.object({ cakeId: z.uuid() });
