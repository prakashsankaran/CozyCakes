import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import {
  filterCakes,
  sortForStorefront,
  toCakeCard,
  toCakeDetail,
  type CakeCard,
  type CakeDetail,
  type CakeFilter,
  type Home,
  type Tag,
} from "@cozycakes/core";
import { catalogRepository, getDb } from "@cozycakes/db";

/**
 * Server-side catalog access shared by pages and `/api/v1` handlers (one source of truth for
 * web and the future mobile app). Raw records are cached briefly; storefront rules that depend on
 * "now" (earliest dates) are applied per request.
 */

async function loadCatalog() {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");
  const repo = catalogRepository(getDb());
  const [cakes, tags, timeZone] = await Promise.all([
    repo.listPublicCakes(),
    repo.listTags(),
    repo.getTimeZone(),
  ]);
  return { cakes: sortForStorefront(cakes), tags, timeZone };
}

async function catalog() {
  await connection();
  const data = await loadCatalog();
  return { ...data, ctx: { timeZone: data.timeZone, now: new Date() } };
}

export async function listCakeCards(filter: Partial<CakeFilter> = {}): Promise<CakeCard[]> {
  const { cakes, ctx } = await catalog();
  return filterCakes(
    cakes.map((c) => toCakeCard(c, ctx)),
    filter,
  );
}

export async function getCakeDetail(slug: string): Promise<CakeDetail | null> {
  const { cakes, ctx } = await catalog();
  const cake = cakes.find((c) => c.slug === slug);
  return cake ? toCakeDetail(cake, ctx) : null;
}

export async function listTags(): Promise<Tag[]> {
  return (await catalog()).tags;
}

export async function getHome(): Promise<Home> {
  const { cakes, tags, ctx } = await catalog();
  const cards = cakes.map((c) => toCakeCard(c, ctx));
  const featured = cards.filter((c) => c.featured && c.available);
  return {
    featured: featured.length ? featured : cards.filter((c) => c.available).slice(0, 4),
    occasions: tags.filter((t) => t.type === "occasion"),
  };
}

export function tagLabel(tags: Tag[], slug: string): string {
  return tags.find((t) => t.slug === slug)?.label ?? slug;
}
