import { describe, expect, it } from "vitest";
import {
  filterCakes,
  sortForStorefront,
  startingPrice,
  toCakeCard,
  toCakeDetail,
  type CakeRecord,
} from "../src/catalog";

function cake(overrides: Partial<CakeRecord> = {}): CakeRecord {
  return {
    id: "c1",
    slug: "chocolate-dream",
    name: "Chocolate Dream",
    tagline: "Rich and fudgy",
    story: "",
    photos: [{ url: "/a.jpg", alt: "A chocolate cake", width: 800, height: 1000 }],
    occasionTags: ["birthday"],
    dietaryTags: ["eggless"],
    flavourTags: ["chocolate"],
    leadTimeDays: 2,
    status: "visible",
    featured: false,
    sortOrder: 0,
    sizes: [
      { id: "s1", label: "1 kg", serves: "8–10", price: 140000, active: true },
      { id: "s2", label: "0.5 kg", serves: "4–6", price: 80000, active: true },
      { id: "s3", label: "2 kg", serves: "16–20", price: 50000, active: false },
    ],
    optionGroups: [],
    ...overrides,
  };
}

const now = new Date("2026-10-19T04:30:00Z");

describe("catalog", () => {
  it("starting price is the cheapest active size", () => {
    expect(startingPrice(cake().sizes)).toBe(80000);
    expect(startingPrice([])).toBeNull();
  });

  it("builds a card with earliest date from lead time", () => {
    const card = toCakeCard(cake(), { now });
    expect(card.available).toBe(true);
    expect(card.earliestDate).toBe("2026-10-21");
    expect(card.cover?.alt).toBe("A chocolate cake");
  });

  it("marks paused cakes as not available (FR-004)", () => {
    expect(toCakeCard(cake({ status: "paused" }), { now }).available).toBe(false);
  });

  it("marks cakes without active sizes as not available", () => {
    const card = toCakeCard(cake({ sizes: [] }), { now });
    expect(card.available).toBe(false);
    expect(card.startingPrice).toBeNull();
  });

  it("refuses to expose drafts and archived cakes", () => {
    expect(() => toCakeCard(cake({ status: "draft" }))).toThrow();
    expect(() => toCakeCard(cake({ status: "archived" }))).toThrow();
  });

  it("detail hides inactive sizes and empty option groups", () => {
    const detail = toCakeDetail(
      cake({
        optionGroups: [
          { id: "g1", name: "Add-ons", kind: "multi", required: false, maxSelect: 3, options: [] },
        ],
      }),
      { now },
    );
    expect(detail.sizes.map((s) => s.id)).toEqual(["s1", "s2"]);
    expect(detail.optionGroups).toEqual([]);
  });

  describe("filterCakes", () => {
    const cakes = [
      { id: "a", occasionTags: ["birthday"], dietaryTags: ["eggless"], flavourTags: ["chocolate"] },
      { id: "b", occasionTags: ["anniversary"], dietaryTags: [], flavourTags: ["vanilla"] },
      {
        id: "c",
        occasionTags: ["birthday", "anniversary"],
        dietaryTags: ["eggless", "nut-free"],
        flavourTags: ["red-velvet"],
      },
    ];
    const ids = (f: Parameters<typeof filterCakes>[1]) => filterCakes(cakes, f).map((c) => c.id);

    it("returns everything with no filters", () => {
      expect(ids({})).toEqual(["a", "b", "c"]);
    });

    it("combines occasion and dietary (spec US1 scenario 2)", () => {
      expect(ids({ occasion: ["birthday"], dietary: ["eggless"] })).toEqual(["a", "c"]);
    });

    it("matches any selected occasion or flavour", () => {
      expect(ids({ flavour: ["vanilla", "red-velvet"] })).toEqual(["b", "c"]);
    });

    it("requires every selected dietary tag", () => {
      expect(ids({ dietary: ["eggless", "nut-free"] })).toEqual(["c"]);
    });

    it("returns an empty list when nothing matches", () => {
      expect(ids({ occasion: ["wedding"] })).toEqual([]);
    });
  });

  it("sorts available cakes before paused ones, then by baker order", () => {
    const sorted = sortForStorefront([
      cake({ id: "p", status: "paused", sortOrder: 0 }),
      cake({ id: "v2", sortOrder: 2 }),
      cake({ id: "v1", sortOrder: 1 }),
    ]);
    expect(sorted.map((c) => c.id)).toEqual(["v1", "v2", "p"]);
  });
});
