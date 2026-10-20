import { describe, expect, it } from "vitest";
import { assertMinor, formatMoney } from "../src/money";

describe("money", () => {
  it("formats whole rupees without decimals", () => {
    expect(formatMoney(125000)).toBe("₹1,250");
  });

  it("keeps paise when present", () => {
    expect(formatMoney(125050)).toBe("₹1,250.50");
  });

  it("uses Indian digit grouping", () => {
    expect(formatMoney(12345600)).toBe("₹1,23,456");
  });

  it("rejects fractional minor units", () => {
    expect(() => assertMinor(10.5)).toThrow(RangeError);
  });
});
