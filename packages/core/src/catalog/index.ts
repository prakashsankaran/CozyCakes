import { earliestFulfilmentDate, DEFAULT_TIME_ZONE } from "../dates";
import type {
  CakeCard,
  CakeDetail,
  CakeFilter,
  OptionGroup,
  Photo,
  Size,
} from "../schemas/catalog";

/** A cake as stored, before storefront rules are applied. */
export interface CakeRecord {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  story: string;
  photos: Photo[];
  occasionTags: string[];
  dietaryTags: string[];
  flavourTags: string[];
  leadTimeDays: number;
  status: "draft" | "visible" | "paused" | "archived";
  featured: boolean;
  sortOrder: number;
  sizes: Array<Size & { active: boolean }>;
  optionGroups: OptionGroup[];
}

export interface CatalogContext {
  timeZone?: string;
  now?: Date;
}

/** Drafts and archived cakes never reach the storefront (FR-004 covers paused ones). */
export function isPublic(cake: CakeRecord): boolean {
  return cake.status === "visible" || cake.status === "paused";
}

export function startingPrice(sizes: CakeRecord["sizes"]): number | null {
  const prices = sizes.filter((s) => s.active).map((s) => s.price);
  return prices.length ? Math.min(...prices) : null;
}

export function toCakeCard(cake: CakeRecord, ctx: CatalogContext = {}): CakeCard {
  if (!isPublic(cake)) throw new Error(`Cake ${cake.slug} is not public`);
  const price = startingPrice(cake.sizes);
  return {
    id: cake.id,
    slug: cake.slug,
    name: cake.name,
    tagline: cake.tagline,
    cover: cake.photos[0] ?? null,
    occasionTags: cake.occasionTags,
    dietaryTags: cake.dietaryTags,
    flavourTags: cake.flavourTags,
    startingPrice: price,
    leadTimeDays: cake.leadTimeDays,
    status: cake.status as CakeCard["status"],
    featured: cake.featured,
    available: cake.status === "visible" && price !== null,
    earliestDate: earliestFulfilmentDate(
      cake.leadTimeDays,
      ctx.timeZone ?? DEFAULT_TIME_ZONE,
      ctx.now,
    ),
  };
}

export function toCakeDetail(cake: CakeRecord, ctx: CatalogContext = {}): CakeDetail {
  return {
    ...toCakeCard(cake, ctx),
    story: cake.story,
    photos: cake.photos,
    sizes: cake.sizes.filter((s) => s.active).map(({ active: _active, ...size }) => size),
    optionGroups: cake.optionGroups.filter((g) => g.options.length > 0),
  };
}

/**
 * Applies storefront filters. Occasion and flavour match any selected value; dietary needs are
 * strict, so a cake must carry every selected dietary tag (eggless AND nut-free).
 */
export function filterCakes<
  T extends Pick<CakeCard, "occasionTags" | "dietaryTags" | "flavourTags">,
>(cakes: T[], filter: Partial<CakeFilter>): T[] {
  const { occasion = [], dietary = [], flavour = [] } = filter;
  return cakes.filter(
    (c) =>
      (occasion.length === 0 || occasion.some((t) => c.occasionTags.includes(t))) &&
      (flavour.length === 0 || flavour.some((t) => c.flavourTags.includes(t))) &&
      dietary.every((t) => c.dietaryTags.includes(t)),
  );
}

/** Storefront order: available before "Back soon", then the baker's chosen order. */
export function sortForStorefront(cakes: CakeRecord[]): CakeRecord[] {
  return [...cakes].sort(
    (a, b) =>
      Number(b.status === "visible") - Number(a.status === "visible") || a.sortOrder - b.sortOrder,
  );
}
