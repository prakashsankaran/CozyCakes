import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import {
  filterCakes,
  quoteCart,
  sortForStorefront,
  toCakeCard,
  toCakeDetail,
  type CakeCard,
  type CakeDetail,
  type CakeFilter,
  type CartItem,
  type CartQuote,
  type OrderLineSnapshot,
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

/** Re-prices a device cart against the live catalog (FR-007). */
export async function quoteCartItems(items: CartItem[]): Promise<CartQuote> {
  const { cakes, ctx } = await catalog();
  const byId = new Map(cakes.map((c) => [c.id, c]));
  return quoteCart(
    items,
    (id) => {
      const cake = byId.get(id);
      return cake ? toCakeDetail(cake, ctx) : null;
    },
    ctx,
  );
}

/**
 * Prices a cart for an order: the quote plus each line frozen with its option prices, as copied
 * onto the order (data-model.md "OrderItem").
 */
export async function priceCartForOrder(
  items: CartItem[],
): Promise<{ quote: CartQuote; lines: OrderLineSnapshot[] }> {
  const { cakes, ctx } = await catalog();
  const details = new Map(cakes.map((c) => [c.id, toCakeDetail(c, ctx)]));
  const quote = quoteCart(items, (id) => details.get(id) ?? null, ctx);
  const lines = items.flatMap((item): OrderLineSnapshot[] => {
    const line = quote.lines.find((l) => l.itemId === item.id);
    const cake = details.get(item.cakeId);
    if (!line || line.status !== "ok" || !cake) return [];
    const options = cake.optionGroups
      .flatMap((g) => g.options)
      .filter((o) => item.optionIds.includes(o.id))
      .map((o) => ({ name: o.name, priceDelta: o.priceDelta }));
    return [
      {
        cakeId: cake.id,
        cakeName: cake.name,
        sizeLabel: line.sizeLabel ?? "",
        options,
        message: item.message,
        referencePhotoUrl: item.referencePhoto?.url ?? null,
        unitPrice: line.unitPrice,
        quantity: line.quantity,
        lineTotal: line.lineTotal,
      },
    ];
  });
  return { quote, lines };
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
