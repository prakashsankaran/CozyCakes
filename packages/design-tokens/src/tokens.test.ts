import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { colorVariables, contrastRatio, radii, shadows, textPairs } from "./tokens";

// Case-insensitive: Prettier lowercases hex colours in CSS.
const css = readFileSync(new URL("./tokens.css", import.meta.url), "utf8").toLowerCase();

describe("design tokens", () => {
  it("tokens.css declares every colour token with the same value", () => {
    for (const [name, hex] of Object.entries(colorVariables())) {
      expect(css, name).toContain(`${name}: ${hex.toLowerCase()};`);
    }
  });

  it("tokens.css declares radii and shadows from tokens.ts", () => {
    for (const [k, v] of Object.entries(radii)) expect(css).toContain(`--radius-${k}: ${v};`);
    for (const [k, v] of Object.entries(shadows)) expect(css).toContain(`--shadow-${k}: ${v};`);
  });

  it.each(textPairs)("$name meets WCAG AA contrast", ({ fg, bg }) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });
});
