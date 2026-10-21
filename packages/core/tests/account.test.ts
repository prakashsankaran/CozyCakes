import { describe, expect, it } from "vitest";
import { FavouriteInputSchema, SavedAddressInputSchema } from "../src/schemas/account";

describe("saved addresses (US6)", () => {
  it("trims the parts and treats the label and extras as optional", () => {
    expect(
      SavedAddressInputSchema.parse({
        line1: " 12 MG Road ",
        city: "Bengaluru",
        postalCode: "560001",
      }),
    ).toEqual({
      label: "",
      line1: "12 MG Road",
      line2: "",
      landmark: "",
      city: "Bengaluru",
      postalCode: "560001",
    });
  });

  it("refuses a missing street, a bad PIN code and a long label", () => {
    const base = { line1: "12 MG Road", city: "Bengaluru", postalCode: "560001" };
    expect(SavedAddressInputSchema.safeParse({ ...base, line1: " " }).success).toBe(false);
    expect(SavedAddressInputSchema.safeParse({ ...base, postalCode: "5600" }).success).toBe(false);
    expect(SavedAddressInputSchema.safeParse({ ...base, label: "x".repeat(31) }).success).toBe(
      false,
    );
  });
});

describe("favourites", () => {
  it("needs a cake id", () => {
    expect(FavouriteInputSchema.safeParse({ cakeId: "not-a-cake" }).success).toBe(false);
  });
});
