/**
 * CozyCakes design tokens: the single source of visual truth for web and the future mobile app
 * (Constitution Principle II). `tokens.css` mirrors these values as CSS variables; a unit test
 * keeps the two in sync and checks text contrast against WCAG AA.
 *
 * Palette is inferred from the brand name until owner-supplied assets arrive (research.md §4).
 */

export const colors = {
  cream: { 50: "#FFF8F0", 100: "#FBEFE2", 200: "#F5E1CC", 300: "#EBCBAA" },
  cocoa: { 500: "#7A5A50", 700: "#5C3B33", 900: "#3B2420" },
  blush: { 100: "#FDEBEF", 200: "#FADBE1", 400: "#F4B6C2", 700: "#A84860" },
  caramel: { 200: "#F3D3B5", 400: "#D9925B", 700: "#8F5424" },
  pistachio: { 200: "#DCEAD4", 400: "#A8C99B", 700: "#4E7342" },
  white: "#FFFFFF",
} as const;

export const fonts = {
  display: "Fraunces",
  text: "Nunito Sans",
} as const;

export const radii = {
  sm: "12px",
  md: "20px",
  lg: "28px",
  pill: "999px",
} as const;

export const shadows = {
  soft: "0 8px 24px -12px rgba(59, 36, 32, 0.25)",
  lifted: "0 24px 48px -20px rgba(59, 36, 32, 0.35)",
} as const;

export const motion = {
  durations: { fast: 150, base: 250, slow: 450 },
  /** Gentle overshoot used for playful entrances. */
  springy: { type: "spring", stiffness: 260, damping: 22 },
  ease: [0.22, 1, 0.36, 1],
} as const;

/** Text/background pairs used by the UI; each must meet WCAG AA (4.5:1) for body text. */
export const textPairs: ReadonlyArray<{ name: string; fg: string; bg: string }> = [
  { name: "body on cream", fg: colors.cocoa[900], bg: colors.cream[50] },
  { name: "secondary on cream", fg: colors.cocoa[700], bg: colors.cream[50] },
  { name: "muted on cream", fg: colors.cocoa[500], bg: colors.cream[50] },
  { name: "muted on surface", fg: colors.cocoa[500], bg: colors.cream[100] },
  { name: "accent text on cream", fg: colors.blush[700], bg: colors.cream[50] },
  { name: "caramel text on cream", fg: colors.caramel[700], bg: colors.cream[50] },
  { name: "success text on cream", fg: colors.pistachio[700], bg: colors.cream[50] },
  { name: "primary button", fg: colors.cream[50], bg: colors.cocoa[900] },
  { name: "blush chip", fg: colors.cocoa[900], bg: colors.blush[400] },
  { name: "caramel chip", fg: colors.cocoa[900], bg: colors.caramel[200] },
];

/** CSS variable name for every colour token, e.g. `--color-cocoa-900`. */
export function colorVariables(): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [family, value] of Object.entries(colors)) {
    if (typeof value === "string") {
      vars[`--color-${family}`] = value;
    } else {
      for (const [step, hex] of Object.entries(value)) vars[`--color-${family}-${step}`] = hex;
    }
  }
  return vars;
}

/** WCAG 2.x contrast ratio between two hex colours. */
export function contrastRatio(a: string, b: string): number {
  const luminance = (hex: string) => {
    const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const [r, g, bl] = channels.map((c) =>
      c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4),
    ) as [number, number, number];
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}
