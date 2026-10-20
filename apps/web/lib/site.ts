export const site = {
  name: "CozyCakes",
  tagline: "Made-to-order cakes, baked slowly and shared warmly.",
  instagramUrl: process.env.NEXT_PUBLIC_INSTAGRAM_URL ?? "https://www.instagram.com/cosycaker",
  instagramHandle: "@cosycaker",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
} as const;
