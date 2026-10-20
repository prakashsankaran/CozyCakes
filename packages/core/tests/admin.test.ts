import { describe, expect, it } from "vitest";
import {
  CakeInputSchema,
  DayAvailabilityInputSchema,
  OptionGroupInputSchema,
  rupeesToPaise,
  slugify,
  type CakeInput,
} from "../src/schemas/admin";

function cakeInput(overrides: Partial<CakeInput> = {}): CakeInput {
  return {
    name: "Pistachio Rose",
    slug: "pistachio-rose",
    tagline: "",
    story: "",
    leadTimeDays: 2,
    status: "visible",
    featured: false,
    occasionTags: [],
    dietaryTags: [],
    flavourTags: [],
    photos: [],
    sizes: [{ label: "1 kg", serves: "8–10", price: 140000, active: true }],
    optionGroupIds: [],
    ...overrides,
  };
}

describe("slugify", () => {
  it("makes friendly web addresses from cake names", () => {
    expect(slugify("Pistachio & Rose!")).toBe("pistachio-and-rose");
    expect(slugify("  Crème Brûlée  Cake ")).toBe("creme-brulee-cake");
    expect(slugify("🎂")).toBe("");
  });

  it("keeps addresses short without a trailing dash", () => {
    const slug = slugify(`${"a".repeat(59)} b`);
    expect(slug.length).toBeLessThanOrEqual(60);
    expect(slug.endsWith("-")).toBe(false);
  });
});

describe("rupeesToPaise", () => {
  it("accepts the ways an owner types a price", () => {
    expect(rupeesToPaise("1400")).toBe(140000);
    expect(rupeesToPaise("₹1,400")).toBe(140000);
    expect(rupeesToPaise("750.5")).toBe(75050);
    expect(rupeesToPaise(" 99.99 ")).toBe(9999);
  });

  it("rejects anything that isn't an amount", () => {
    expect(rupeesToPaise("")).toBeNull();
    expect(rupeesToPaise("abc")).toBeNull();
    expect(rupeesToPaise("-5")).toBeNull();
    expect(rupeesToPaise("1.234")).toBeNull();
  });
});

describe("CakeInputSchema", () => {
  it("accepts a complete cake", () => {
    expect(CakeInputSchema.safeParse(cakeInput()).success).toBe(true);
  });

  it("won't put a cake on the menu without a size customers can pick", () => {
    const sizes = [{ label: "1 kg", serves: "8–10", price: 140000, active: false }];
    const result = CakeInputSchema.safeParse(cakeInput({ sizes }));
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toMatch(/at least one size/);
    // A draft can be saved half-finished.
    expect(CakeInputSchema.safeParse(cakeInput({ sizes, status: "draft" })).success).toBe(true);
  });

  it("rejects web addresses with spaces or capitals", () => {
    expect(CakeInputSchema.safeParse(cakeInput({ slug: "Pistachio Rose" })).success).toBe(false);
  });

  it("rejects free cakes", () => {
    const sizes = [{ label: "1 kg", serves: "8–10", price: 0, active: true }];
    expect(CakeInputSchema.safeParse(cakeInput({ sizes })).success).toBe(false);
  });
});

describe("OptionGroupInputSchema", () => {
  const group = {
    name: "Toppings",
    kind: "multi" as const,
    required: false,
    maxSelect: 3,
    options: [{ name: "Gold stars", priceDelta: 5000, swatch: "#F4B6C2", active: true }],
  };

  it("accepts a pick-several group with a maximum", () => {
    expect(OptionGroupInputSchema.safeParse(group).success).toBe(true);
  });

  it("only lets pick-several groups have a maximum", () => {
    expect(OptionGroupInputSchema.safeParse({ ...group, kind: "single" }).success).toBe(false);
    expect(
      OptionGroupInputSchema.safeParse({ ...group, kind: "single", maxSelect: null }).success,
    ).toBe(true);
  });

  it("only accepts hex colours", () => {
    const options = [{ ...group.options[0]!, swatch: "pink" }];
    expect(OptionGroupInputSchema.safeParse({ ...group, options }).success).toBe(false);
  });
});

describe("DayAvailabilityInputSchema", () => {
  it("rejects dates that don't exist", () => {
    const day = { blocked: true, capacityOverride: null, note: "" };
    expect(DayAvailabilityInputSchema.safeParse({ ...day, date: "2026-12-25" }).success).toBe(true);
    expect(DayAvailabilityInputSchema.safeParse({ ...day, date: "2026-02-30" }).success).toBe(
      false,
    );
  });
});
