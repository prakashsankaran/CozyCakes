import { z } from "zod";

/**
 * Catalog read models: the response shapes of `/api/v1/home`, `/cakes`, `/cakes/{slug}` and
 * `/tags` (contracts/api-v1.md). JSON field names are camelCase; money is integer minor units.
 */

export const TagTypeSchema = z.enum(["occasion", "dietary", "flavour"]);
export type TagType = z.infer<typeof TagTypeSchema>;

export const TagSchema = z.object({
  slug: z.string(),
  label: z.string(),
  type: TagTypeSchema,
  emoji: z.string().nullable(),
});
export type Tag = z.infer<typeof TagSchema>;

export const PhotoSchema = z.object({
  url: z.string(),
  alt: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});
export type Photo = z.infer<typeof PhotoSchema>;

export const SizeSchema = z.object({
  id: z.string(),
  label: z.string(),
  serves: z.string(),
  price: z.number().int().positive(),
});
export type Size = z.infer<typeof SizeSchema>;

export const OptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  priceDelta: z.number().int().nonnegative(),
  swatch: z.string().nullable(),
});
export type Option = z.infer<typeof OptionSchema>;

export const OptionGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(["single", "multi"]),
  required: z.boolean(),
  maxSelect: z.number().int().positive().nullable(),
  options: z.array(OptionSchema),
});
export type OptionGroup = z.infer<typeof OptionGroupSchema>;

/** Storefront-visible statuses; drafts and archived cakes are never returned. */
export const PublicCakeStatusSchema = z.enum(["visible", "paused"]);

export const CakeCardSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  tagline: z.string(),
  cover: PhotoSchema.nullable(),
  occasionTags: z.array(z.string()),
  dietaryTags: z.array(z.string()),
  flavourTags: z.array(z.string()),
  startingPrice: z.number().int().positive().nullable(),
  leadTimeDays: z.number().int().nonnegative(),
  status: PublicCakeStatusSchema,
  featured: z.boolean(),
  /** False when paused ("Back soon") or without any active size. */
  available: z.boolean(),
  /** Earliest fulfilment date from lead time alone, `YYYY-MM-DD` in the bakery time zone. */
  earliestDate: z.string(),
});
export type CakeCard = z.infer<typeof CakeCardSchema>;

export const CakeDetailSchema = CakeCardSchema.extend({
  story: z.string(),
  photos: z.array(PhotoSchema),
  sizes: z.array(SizeSchema),
  optionGroups: z.array(OptionGroupSchema),
});
export type CakeDetail = z.infer<typeof CakeDetailSchema>;

export const HomeSchema = z.object({
  featured: z.array(CakeCardSchema),
  occasions: z.array(TagSchema),
});
export type Home = z.infer<typeof HomeSchema>;

const csv = z
  .string()
  .optional()
  .transform((v) =>
    v
      ? v
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [],
  );

/** Query string for `GET /api/v1/cakes`; each facet accepts a comma-separated list. */
export const CakeFilterQuerySchema = z.object({
  occasion: csv,
  dietary: csv,
  flavour: csv,
});
export type CakeFilter = z.infer<typeof CakeFilterQuerySchema>;
