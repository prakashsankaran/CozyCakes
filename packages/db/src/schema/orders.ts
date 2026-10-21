import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgSequence,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { cakes } from "./catalog";
import { timeSlots } from "./availability";
import { id, timestamps } from "./common";

/**
 * Orders and payments (data-model.md). Customer and staff accounts arrive with Better Auth
 * (tasks T047); until then `userId` is a nullable reference stored without a foreign key.
 */

export const orderStatus = pgEnum("order_status", [
  "confirmed",
  "baking",
  "ready",
  "out_for_delivery",
  "ready_for_pickup",
  "delivered",
  "collected",
  "cancelled",
]);
export const fulfilmentMethod = pgEnum("fulfilment_method", ["delivery", "pickup"]);
export const checkoutStatus = pgEnum("checkout_status", ["open", "paid", "expired", "failed"]);
export const paymentStatus = pgEnum("payment_status", [
  "created",
  "captured",
  "failed",
  "refunded",
  "partially_refunded",
]);
export const discountType = pgEnum("discount_type", ["percent", "fixed"]);

export interface Contact {
  name: string;
  email: string;
  phone: string;
}

export interface AddressSnapshot {
  line1: string;
  line2?: string;
  landmark?: string;
  city: string;
  postalCode: string;
  contactPhone?: string;
}

export const discountCodes = pgTable(
  "discount_codes",
  {
    id: id(),
    code: text("code").notNull(),
    type: discountType("type").notNull(),
    value: integer("value").notNull(),
    minSubtotal: integer("min_subtotal").notNull().default(0),
    /** First and last days the code works, inclusive, in the bakery's time zone. */
    startsOn: date("starts_on"),
    endsOn: date("ends_on"),
    maxRedemptions: integer("max_redemptions"),
    redemptions: integer("redemptions").notNull().default(0),
    active: boolean("active").notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex("discount_codes_code_ci").on(sql`lower(${t.code})`)],
);

/** Human-friendly order numbers: CC-24001, CC-24002, … */
export const orderNumberSeq = pgSequence("order_number_seq", { startWith: 24001 });

export const checkouts = pgTable("checkouts", {
  id: id(),
  /** Priced cart, fulfilment and contact snapshot taken when payment starts. */
  snapshot: jsonb("snapshot").notNull(),
  holdId: uuid("hold_id"),
  paymentProviderOrderId: text("payment_provider_order_id").unique(),
  status: checkoutStatus("status").notNull().default("open"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ...timestamps,
});

export const orders = pgTable(
  "orders",
  {
    id: id(),
    number: text("number").notNull().unique(),
    trackingToken: text("tracking_token").notNull().unique(),
    checkoutId: uuid("checkout_id")
      .notNull()
      .unique()
      .references(() => checkouts.id),
    userId: text("user_id"),
    contact: jsonb("contact").$type<Contact>().notNull(),
    fulfilment: fulfilmentMethod("fulfilment").notNull(),
    date: date("date").notNull(),
    slotId: uuid("slot_id").references(() => timeSlots.id),
    /** Slot as the customer saw it, so renaming a slot never rewrites past orders. */
    slotLabel: text("slot_label").notNull().default(""),
    address: jsonb("address").$type<AddressSnapshot>(),
    noteToBaker: text("note_to_baker").notNull().default(""),
    subtotal: integer("subtotal").notNull(),
    deliveryFee: integer("delivery_fee").notNull().default(0),
    discount: integer("discount").notNull().default(0),
    total: integer("total").notNull(),
    discountCodeId: uuid("discount_code_id").references(() => discountCodes.id),
    status: orderStatus("status").notNull().default("confirmed"),
    cancelReason: text("cancel_reason"),
    ...timestamps,
  },
  (t) => [index("orders_date_idx").on(t.date)],
);

export const orderItems = pgTable("order_items", {
  id: id(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  cakeId: uuid("cake_id").references(() => cakes.id),
  cakeName: text("cake_name").notNull(),
  sizeLabel: text("size_label").notNull(),
  options: jsonb("options").$type<Array<{ name: string; priceDelta: number }>>().notNull(),
  message: text("message").notNull().default(""),
  referencePhotoUrl: text("reference_photo_url"),
  unitPrice: integer("unit_price").notNull(),
  quantity: integer("quantity").notNull(),
  lineTotal: integer("line_total").notNull(),
});

/** Append-only audit of status changes (Constitution Principle IV). */
export const orderStatusEvents = pgTable("order_status_events", {
  id: id(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  fromStatus: orderStatus("from_status"),
  toStatus: orderStatus("to_status").notNull(),
  actorUserId: text("actor_user_id"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const payments = pgTable("payments", {
  id: id(),
  checkoutId: uuid("checkout_id")
    .notNull()
    .references(() => checkouts.id),
  orderId: uuid("order_id").references(() => orders.id),
  provider: text("provider").notNull().default("razorpay"),
  /** Unique: repeated provider notifications must not create duplicate orders (SC-006). */
  providerPaymentId: text("provider_payment_id").notNull().unique(),
  amount: integer("amount").notNull(),
  status: paymentStatus("status").notNull(),
  rawEvent: jsonb("raw_event"),
  ...timestamps,
});

export const refunds = pgTable("refunds", {
  id: id(),
  paymentId: uuid("payment_id")
    .notNull()
    .references(() => payments.id),
  amount: integer("amount").notNull(),
  providerRefundId: text("provider_refund_id").unique(),
  status: text("status").notNull(),
  reason: text("reason"),
  ...timestamps,
});

export const referenceUploads = pgTable("reference_uploads", {
  id: id(),
  url: text("url").notNull(),
  bytes: integer("bytes").notNull(),
  mime: text("mime").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
