/**
 * Placeholder menu until the baker's real cakes and photos arrive (tasks T019).
 *
 * Default mode wipes catalog and availability tables, so it refuses to run against production.
 * `--if-outdated` reloads the menu only when the database has no cakes or holds an older sample
 * menu than `SAMPLE_MENU_VERSION`; deploys use it (tasks T081). Bump the version when the sample
 * menu changes. Once the owner edits the menu in the back office (US5) the version becomes -1 and
 * deploys never touch the catalog again (tasks T083).
 */
import { eq } from "drizzle-orm";
import { createDb } from "./client";
import {
  bakerySettings,
  cakeOptionGroups,
  cakes,
  optionGroups,
  options,
  sizes,
  tags,
  timeSlots,
} from "./schema";

const SAMPLE_MENU_VERSION = 2;

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const ifOutdated = process.argv.includes("--if-outdated");
if (!ifOutdated && process.env.NODE_ENV === "production" && !process.argv.includes("--force")) {
  throw new Error("Refusing to seed a production database (pass --force or --if-outdated)");
}

const db = createDb(url);

if (ifOutdated) {
  const [settings] = await db
    .select({ version: bakerySettings.sampleMenuVersion })
    .from(bakerySettings)
    .where(eq(bakerySettings.id, 1));
  const hasCakes = (await db.$count(cakes)) > 0;
  const version = settings?.version ?? 0;
  // -1 means the owner has edited the menu in the back office: never replace it.
  if (version < 0 || (hasCakes && version >= SAMPLE_MENU_VERSION)) {
    await db.$client.end();
    console.log(
      version < 0
        ? "The owner manages the menu; leaving the catalog untouched"
        : `Sample menu v${version} is current; leaving the catalog untouched`,
    );
    process.exit(0);
  }
}
const rupees = (r: number) => r * 100;

const tagRows: (typeof tags.$inferInsert)[] = [
  { slug: "birthday", label: "Birthdays", type: "occasion", emoji: "🎂", sortOrder: 1 },
  { slug: "anniversary", label: "Anniversaries", type: "occasion", emoji: "💞", sortOrder: 2 },
  { slug: "celebration", label: "Celebrations", type: "occasion", emoji: "🎉", sortOrder: 3 },
  { slug: "just-because", label: "Just because", type: "occasion", emoji: "🌼", sortOrder: 4 },
  { slug: "eggless", label: "Eggless", type: "dietary", emoji: "🌱", sortOrder: 1 },
  { slug: "nut-free", label: "Nut-free", type: "dietary", emoji: null, sortOrder: 2 },
  { slug: "chocolate", label: "Chocolate", type: "flavour", emoji: null, sortOrder: 1 },
  { slug: "vanilla", label: "Vanilla", type: "flavour", emoji: null, sortOrder: 2 },
  { slug: "red-velvet", label: "Red velvet", type: "flavour", emoji: null, sortOrder: 3 },
  { slug: "pistachio", label: "Pistachio", type: "flavour", emoji: null, sortOrder: 4 },
  { slug: "fruit", label: "Fruity", type: "flavour", emoji: null, sortOrder: 5 },
  { slug: "coffee", label: "Coffee & caramel", type: "flavour", emoji: null, sortOrder: 6 },
];

type SeedCake = typeof cakes.$inferInsert & {
  sizeList: Array<[label: string, serves: string, price: number]>;
  groups: string[];
};

const standardSizes: SeedCake["sizeList"] = [
  ["0.5 kg", "4–6", 750],
  ["1 kg", "8–10", 1400],
  ["1.5 kg", "12–15", 2000],
];

const cakeRows: SeedCake[] = [
  {
    slug: "chocolate-truffle-dream",
    name: "Chocolate Truffle Dream",
    tagline: "Layers of dark chocolate sponge and silky truffle.",
    story:
      "The one I bake most. Moist dark chocolate sponge, a whipped truffle filling and a glossy ganache drip. It tastes like a hug from someone who really likes chocolate.",
    occasionTags: ["birthday", "celebration"],
    dietaryTags: ["eggless"],
    flavourTags: ["chocolate"],
    featured: true,
    sizeList: standardSizes,
    groups: ["Frosting", "Add-ons"],
  },
  {
    slug: "red-velvet-romance",
    name: "Red Velvet Romance",
    tagline: "Velvety crimson crumb with tangy cream cheese.",
    story:
      "Soft cocoa-kissed red velvet with a cream cheese frosting that's just sweet enough. Made for anniversaries and anyone who deserves a little romance.",
    occasionTags: ["anniversary", "celebration"],
    dietaryTags: [],
    flavourTags: ["red-velvet"],
    featured: true,
    sizeList: [
      ["0.5 kg", "4–6", 850],
      ["1 kg", "8–10", 1600],
    ],
    groups: ["Add-ons"],
  },
  {
    slug: "vanilla-cloud",
    name: "Vanilla Cloud",
    tagline: "Light-as-air vanilla bean sponge and fresh cream.",
    story:
      "Proof that simple can be spectacular. Real vanilla bean, airy sponge and whipped fresh cream. Little ones love it, grown-ups secretly love it more.",
    occasionTags: ["birthday", "just-because"],
    dietaryTags: ["eggless", "nut-free"],
    flavourTags: ["vanilla"],
    sizeList: standardSizes.map(([l, s, p]) => [l, s, p - 100]),
    groups: ["Frosting", "Add-ons"],
  },
  {
    slug: "pistachio-rose",
    name: "Pistachio Rose",
    tagline: "Toasted pistachio, rose cream and edible petals.",
    story:
      "Fragrant rose cream, toasted pistachio sponge and a scatter of edible petals. Elegant enough for a wedding anniversary, cozy enough for a Sunday.",
    occasionTags: ["anniversary", "celebration"],
    dietaryTags: ["eggless"],
    flavourTags: ["pistachio"],
    featured: true,
    sizeList: [
      ["0.5 kg", "4–6", 950],
      ["1 kg", "8–10", 1800],
    ],
    groups: ["Add-ons"],
  },
  {
    slug: "coffee-caramel-crunch",
    name: "Coffee Caramel Crunch",
    tagline: "Espresso sponge, salted caramel and praline crunch.",
    story:
      "For the coffee people. Espresso-soaked sponge, salted caramel and a crunchy praline layer that makes every bite interesting.",
    occasionTags: ["celebration", "just-because"],
    dietaryTags: [],
    flavourTags: ["coffee"],
    sizeList: standardSizes.map(([l, s, p]) => [l, s, p + 100]),
    groups: ["Frosting", "Add-ons"],
  },
  {
    slug: "biscoff-bliss",
    name: "Biscoff Bliss",
    tagline: "Spiced cookie butter, all the way through.",
    story:
      "Caramelised Biscoff cookie butter in the sponge, the frosting and the crumble on top. Dangerously moreish.",
    occasionTags: ["birthday", "just-because"],
    dietaryTags: ["eggless"],
    flavourTags: ["coffee", "vanilla"],
    sizeList: standardSizes.map(([l, s, p]) => [l, s, p + 50]),
    groups: ["Add-ons"],
  },
  {
    slug: "your-theme-cake",
    name: "Your Theme Cake",
    tagline: "Tell me the theme; I'll bake the dream.",
    story:
      "Unicorns, football pitches, a favourite cartoon or a minimalist floral: pick a flavour, share a reference photo and I'll design a cake just for your celebration.",
    occasionTags: ["birthday", "celebration"],
    dietaryTags: ["eggless"],
    flavourTags: ["chocolate", "vanilla", "red-velvet"],
    featured: true,
    leadTimeDays: 4,
    sizeList: [
      ["1 kg", "8–10", 2200],
      ["2 kg", "16–20", 4000],
      ["3 kg (two tier)", "25–30", 6000],
    ],
    groups: ["Flavour", "Frosting", "Add-ons"],
  },
  {
    slug: "fresh-mango-delight",
    name: "Fresh Mango Delight",
    tagline: "Alphonso mango and cream, only in season.",
    story:
      "Juicy Alphonso mangoes folded into fresh cream between vanilla sponge. I only bake it when the mangoes are perfect, so it's back with the summer.",
    occasionTags: ["just-because", "celebration"],
    dietaryTags: ["eggless", "nut-free"],
    flavourTags: ["fruit"],
    status: "paused",
    sizeList: standardSizes.map(([l, s, p]) => [l, s, p + 150]),
    groups: ["Add-ons"],
  },
];

const groupDefs: Array<{
  group: typeof optionGroups.$inferInsert;
  options: Array<[name: string, priceDelta: number, swatch: string | null]>;
}> = [
  {
    group: { name: "Flavour", kind: "single", required: true, sortOrder: 1 },
    options: [
      ["Dark chocolate", 0, "#5B3A29"],
      ["Vanilla bean", 0, "#F6E7C8"],
      ["Red velvet", rupees(100), "#9E2B3A"],
    ],
  },
  {
    group: { name: "Frosting", kind: "single", required: true, sortOrder: 2 },
    options: [
      ["Whipped cream", 0, "#FFF6EC"],
      ["Buttercream", rupees(50), "#F9E1B8"],
      ["Chocolate ganache", rupees(100), "#4A2C21"],
    ],
  },
  {
    group: { name: "Dietary", kind: "multi", required: false, maxSelect: 2, sortOrder: 3 },
    options: [
      ["Make it eggless", 0, null],
      ["Less sugar", 0, null],
    ],
  },
  {
    group: { name: "Add-ons", kind: "multi", required: false, maxSelect: 4, sortOrder: 4 },
    options: [
      ["Happy Birthday topper", rupees(150), null],
      ["Sparkler candles", rupees(80), null],
      ["Fresh flowers", rupees(250), null],
      ["Gold sprinkles", rupees(100), null],
    ],
  },
];

await db.transaction(async (tx) => {
  await tx.delete(cakeOptionGroups);
  await tx.delete(sizes);
  await tx.delete(options);
  await tx.delete(optionGroups);
  await tx.delete(cakes);
  await tx.delete(tags);
  await tx.delete(timeSlots);
  await tx.delete(bakerySettings);

  await tx.insert(tags).values(tagRows);

  const groupIds = new Map<string, string>();
  for (const def of groupDefs) {
    const [g] = await tx.insert(optionGroups).values(def.group).returning();
    groupIds.set(def.group.name, g!.id);
    await tx.insert(options).values(
      def.options.map(([name, priceDelta, swatch], i) => ({
        groupId: g!.id,
        name,
        priceDelta,
        swatch,
        sortOrder: i,
      })),
    );
  }

  for (const [i, { sizeList, groups, ...cake }] of cakeRows.entries()) {
    const [row] = await tx
      .insert(cakes)
      .values({ status: "visible", ...cake, sortOrder: i })
      .returning();
    await tx.insert(sizes).values(
      sizeList.map(([label, serves, price], j) => ({
        cakeId: row!.id,
        label,
        serves,
        price: rupees(price),
        sortOrder: j,
      })),
    );
    // Cakes that are (or can be made) eggless offer the dietary step before add-ons.
    const linked = cake.dietaryTags?.includes("eggless")
      ? groups.flatMap((g) => (g === "Add-ons" ? ["Dietary", g] : [g]))
      : groups;
    await tx
      .insert(cakeOptionGroups)
      .values(
        linked.map((name, j) => ({ cakeId: row!.id, groupId: groupIds.get(name)!, sortOrder: j })),
      );
  }

  await tx.insert(bakerySettings).values({ id: 1, sampleMenuVersion: SAMPLE_MENU_VERSION });
  await tx.insert(timeSlots).values([
    { label: "10am – 12pm", start: "10:00", end: "12:00" },
    { label: "12pm – 3pm", start: "12:00", end: "15:00" },
    { label: "4pm – 7pm", start: "16:00", end: "19:00" },
  ]);
});

await db.$client.end();
console.log(`Seeded sample menu v${SAMPLE_MENU_VERSION} with ${cakeRows.length} cakes`);
