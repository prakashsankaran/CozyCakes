export const site = {
  name: "CozyCakes",
  tagline: "Made-to-order cakes, baked slowly and shared warmly.",
  instagramUrl: process.env.NEXT_PUBLIC_INSTAGRAM_URL ?? "https://www.instagram.com/cosycaker",
  instagramHandle: "@cosycaker",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
} as const;

/**
 * Who runs the shop, for the contact and policy pages (Razorpay reviews these before it turns on
 * live payments). Blank details are left out of the pages, so fill them in before going live.
 */
export const business = {
  /** The name on the bank account Razorpay pays into, if it differs from the shop's. */
  legalName: "CozyCakes",
  city: "",
  /** Full kitchen address, shown on the contact page. */
  address: "",
  email: "",
  /** Mobile or WhatsApp number, like "+91 98765 43210". */
  phone: "",
  /** FSSAI registration number for a home food business. */
  fssai: "",
  policiesUpdated: "21 October 2026",
} as const;
