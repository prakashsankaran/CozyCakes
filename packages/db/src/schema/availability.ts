import {
  boolean,
  date,
  integer,
  pgEnum,
  pgTable,
  text,
  time,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { id, timestamps } from "./common";

export const slotFulfilment = pgEnum("slot_fulfilment", ["delivery", "pickup", "both"]);

/** Singleton row (id = 1). */
export const bakerySettings = pgTable("bakery_settings", {
  id: integer("id").primaryKey().default(1),
  timeZone: text("time_zone").notNull().default("Asia/Kolkata"),
  currency: text("currency").notNull().default("INR"),
  defaultDailyCapacity: integer("default_daily_capacity").notNull().default(3),
  pickupAddress: text("pickup_address").notNull().default(""),
  pickupInstructions: text("pickup_instructions").notNull().default(""),
  bookingWindowDays: integer("booking_window_days").notNull().default(60),
  holdMinutes: integer("hold_minutes").notNull().default(15),
  /** Version of the placeholder menu loaded by `db:seed`; deploys reload it when it is older. */
  sampleMenuVersion: integer("sample_menu_version").notNull().default(0),
  ...timestamps,
});

export const timeSlots = pgTable("time_slots", {
  id: id(),
  label: text("label").notNull(),
  start: time("start").notNull(),
  end: time("end").notNull(),
  fulfilment: slotFulfilment("fulfilment").notNull().default("both"),
  active: boolean("active").notNull().default(true),
  ...timestamps,
});

/** Per-date override; also the lock row for capacity checks (research.md §7). */
export const dayAvailability = pgTable("day_availability", {
  date: date("date").primaryKey(),
  capacityOverride: integer("capacity_override"),
  blocked: boolean("blocked").notNull().default(false),
  note: text("note"),
  ...timestamps,
});

export const deliveryZones = pgTable("delivery_zones", {
  postalCode: text("postal_code").primaryKey(),
  fee: integer("fee").notNull(),
  active: boolean("active").notNull().default(true),
  ...timestamps,
});

export const capacityHolds = pgTable("capacity_holds", {
  id: id(),
  date: date("date").notNull(),
  checkoutId: uuid("checkout_id").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  convertedAt: timestamp("converted_at", { withTimezone: true }),
  ...timestamps,
});
