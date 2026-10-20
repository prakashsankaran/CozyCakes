import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import type { Photo } from "@cozycakes/core";
import { id, timestamps } from "./common";

export const cakeStatus = pgEnum("cake_status", ["draft", "visible", "paused", "archived"]);
export const tagType = pgEnum("tag_type", ["occasion", "dietary", "flavour"]);
export const optionGroupKind = pgEnum("option_group_kind", ["single", "multi"]);

export const cakes = pgTable("cakes", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  tagline: text("tagline").notNull().default(""),
  story: text("story").notNull().default(""),
  photos: jsonb("photos").$type<Photo[]>().notNull().default([]),
  occasionTags: text("occasion_tags").array().notNull().default([]),
  dietaryTags: text("dietary_tags").array().notNull().default([]),
  flavourTags: text("flavour_tags").array().notNull().default([]),
  leadTimeDays: integer("lead_time_days").notNull().default(2),
  status: cakeStatus("status").notNull().default("draft"),
  featured: boolean("featured").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
});

export const sizes = pgTable("sizes", {
  id: id(),
  cakeId: uuid("cake_id")
    .notNull()
    .references(() => cakes.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  serves: text("serves").notNull(),
  price: integer("price").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  ...timestamps,
});

export const optionGroups = pgTable("option_groups", {
  id: id(),
  name: text("name").notNull(),
  kind: optionGroupKind("kind").notNull(),
  required: boolean("required").notNull().default(false),
  maxSelect: integer("max_select"),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
});

export const options = pgTable("options", {
  id: id(),
  groupId: uuid("group_id")
    .notNull()
    .references(() => optionGroups.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  priceDelta: integer("price_delta").notNull().default(0),
  swatch: text("swatch"),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
});

/** Which option groups a cake offers; `optionIds` limits the subset (null = all active options). */
export const cakeOptionGroups = pgTable(
  "cake_option_groups",
  {
    cakeId: uuid("cake_id")
      .notNull()
      .references(() => cakes.id, { onDelete: "cascade" }),
    groupId: uuid("group_id")
      .notNull()
      .references(() => optionGroups.id, { onDelete: "cascade" }),
    optionIds: uuid("option_ids").array(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.cakeId, t.groupId] })],
);

export const tags = pgTable("tags", {
  slug: text("slug").primaryKey(),
  label: text("label").notNull(),
  type: tagType("type").notNull(),
  emoji: text("emoji"),
  sortOrder: integer("sort_order").notNull().default(0),
});
