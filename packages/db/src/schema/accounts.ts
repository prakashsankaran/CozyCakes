import { index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { users } from "./auth";
import { cakes } from "./catalog";
import { id, timestamps } from "./common";

/** A customer's saved delivery addresses and favourite cakes (US6, data-model.md). */

export const addresses = pgTable(
  "addresses",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    label: text("label").notNull().default(""),
    line1: text("line1").notNull(),
    line2: text("line2").notNull().default(""),
    landmark: text("landmark").notNull().default(""),
    city: text("city").notNull(),
    postalCode: text("postal_code").notNull(),
    ...timestamps,
  },
  (t) => [index("addresses_user_idx").on(t.userId)],
);

export const favourites = pgTable(
  "favourites",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    cakeId: uuid("cake_id")
      .notNull()
      .references(() => cakes.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("favourites_user_cake").on(t.userId, t.cakeId)],
);
