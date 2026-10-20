import { describe, expect, it } from "vitest";
import type { CakeDetail } from "../src/schemas/catalog";
import { CartItemSchema, type CartItem } from "../src/schemas/cart";
import {
  configurationIssues,
  describeChoices,
  quoteCart,
  referencePhotoProblem,
  unitPrice,
} from "../src/pricing";

function cake(overrides: Partial<CakeDetail> = {}): CakeDetail {
  return {
    id: "c1",
    slug: "chocolate-dream",
    name: "Chocolate Dream",
    tagline: "Rich and fudgy",
    cover: null,
    occasionTags: [],
    dietaryTags: ["eggless"],
    flavourTags: ["chocolate"],
    startingPrice: 75000,
    leadTimeDays: 2,
    status: "visible",
    featured: false,
    available: true,
    earliestDate: "2026-10-22",
    story: "",
    photos: [],
    sizes: [
      { id: "half", label: "0.5 kg", serves: "4–6", price: 75000 },
      { id: "one", label: "1 kg", serves: "8–10", price: 140000 },
    ],
    optionGroups: [
      {
        id: "frosting",
        name: "Frosting",
        kind: "single",
        required: true,
        maxSelect: null,
        options: [
          { id: "cream", name: "Whipped cream", priceDelta: 0, swatch: null },
          { id: "ganache", name: "Chocolate ganache", priceDelta: 10000, swatch: null },
        ],
      },
      {
        id: "addons",
        name: "Add-ons",
        kind: "multi",
        required: false,
        maxSelect: 2,
        options: [
          { id: "topper", name: "Happy Birthday topper", priceDelta: 15000, swatch: null },
          { id: "candles", name: "Sparkler candles", priceDelta: 8000, swatch: null },
          { id: "flowers", name: "Fresh flowers", priceDelta: 25000, swatch: null },
        ],
      },
    ],
    ...overrides,
  };
}

function item(overrides: Partial<CartItem> = {}): CartItem {
  return {
    id: "line-1",
    cakeId: "c1",
    sizeId: "one",
    optionIds: ["cream"],
    message: "",
    referencePhoto: null,
    quantity: 1,
    ...overrides,
  };
}

const now = new Date("2026-10-19T04:30:00Z");

describe("pricing", () => {
  it("prices 1 kg plus a topper as size price + topper price (US2 scenario 1)", () => {
    expect(unitPrice(cake(), { sizeId: "one", optionIds: ["cream", "topper"] })).toBe(155000);
  });

  it("adds every paid option", () => {
    expect(unitPrice(cake(), { sizeId: "half", optionIds: ["ganache", "topper", "candles"] })).toBe(
      75000 + 10000 + 15000 + 8000,
    );
  });

  it("accepts a complete configuration", () => {
    expect(configurationIssues(cake(), item())).toEqual([]);
  });

  it("requires a size and every required group", () => {
    expect(configurationIssues(cake(), item({ sizeId: "nope", optionIds: [] }))).toEqual([
      "Pick a size",
      "Pick a frosting",
    ]);
  });

  it("allows one choice in a single group and caps multi groups", () => {
    expect(configurationIssues(cake(), item({ optionIds: ["cream", "ganache"] }))).toContain(
      "Pick just one frosting",
    );
    expect(
      configurationIssues(cake(), item({ optionIds: ["cream", "topper", "candles", "flowers"] })),
    ).toContain("Pick up to 2 add-ons");
  });

  it("rejects options the cake does not offer and duplicates", () => {
    expect(configurationIssues(cake(), item({ optionIds: ["cream", "glitter"] }))).toContain(
      "Some choices are no longer offered",
    );
    expect(configurationIssues(cake(), item({ optionIds: ["cream", "cream"] }))).toContain(
      "A choice was picked twice",
    );
  });

  it("limits the message to 40 characters (FR-008)", () => {
    expect(configurationIssues(cake(), item({ message: "x".repeat(40) }))).toEqual([]);
    expect(configurationIssues(cake(), item({ message: "x".repeat(41) }))).toContain(
      "Keep the message to 40 characters",
    );
    expect(CartItemSchema.safeParse(item({ message: "x".repeat(41) })).success).toBe(false);
  });

  it("describes choices in builder order", () => {
    expect(describeChoices(cake(), ["topper", "ganache"])).toEqual([
      "Chocolate ganache",
      "Happy Birthday topper",
    ]);
  });
});

describe("quoteCart", () => {
  const catalog = new Map([
    ["c1", cake()],
    ["c2", cake({ id: "c2", slug: "slow", name: "Slow Bake", leadTimeDays: 4 })],
    ["paused", cake({ id: "paused", name: "Mango", status: "paused", available: false })],
  ]);
  const find = (id: string) => catalog.get(id) ?? null;

  it("totals lines and uses the longest lead time", () => {
    const quote = quoteCart(
      [item(), item({ id: "line-2", cakeId: "c2", optionIds: ["cream", "topper"], quantity: 2 })],
      find,
      { now },
    );
    expect(quote.lines.map((l) => l.lineTotal)).toEqual([140000, 310000]);
    expect(quote.subtotal).toBe(450000);
    expect(quote.itemCount).toBe(3);
    expect(quote.leadTimeDays).toBe(4);
    expect(quote.earliestDate).toBe("2026-10-23");
  });

  it("flags removed or paused cakes and leaves them out of the total", () => {
    const quote = quoteCart(
      [item(), item({ id: "gone", cakeId: "deleted" }), item({ id: "p", cakeId: "paused" })],
      find,
      { now },
    );
    expect(quote.lines.map((l) => l.status)).toEqual(["ok", "unavailable", "unavailable"]);
    expect(quote.lines[2]!.issues).toEqual(["Mango is taking a little break"]);
    expect(quote.subtotal).toBe(140000);
  });

  it("marks lines with stale choices as invalid", () => {
    const quote = quoteCart([item({ optionIds: ["retired"] })], find, { now });
    expect(quote.lines[0]!.status).toBe("invalid");
    expect(quote.subtotal).toBe(0);
    expect(quote.earliestDate).toBeNull();
  });
});

describe("referencePhotoProblem", () => {
  it("accepts common images up to 10 MB", () => {
    expect(referencePhotoProblem({ type: "image/jpeg", size: 2_000_000 })).toBeNull();
  });

  it("explains wrong types and oversized files", () => {
    expect(referencePhotoProblem({ type: "application/pdf", size: 1000 })).toMatch(/isn't a photo/);
    expect(referencePhotoProblem({ type: "image/png", size: 12 * 1024 * 1024 })).toMatch(/10 MB/);
  });
});
