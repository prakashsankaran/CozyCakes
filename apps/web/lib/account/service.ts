import type { Reorder } from "@cozycakes/core";
import { accountsRepository, getDb } from "@cozycakes/db";
import { getCakeDetail, quoteCartItems } from "@/lib/catalog";

/**
 * Account features shared by the `/me` screens and the `/api/v1/me` endpoints (US6, FR-027).
 */

export const accounts = () => accountsRepository(getDb());

/** The customer's profile, saved addresses and claimed orders, claiming any new ones first. */
export async function accountOverview(userId: string, email: string) {
  await accounts().claimOrders(userId, email);
  const [profile, addresses, orders, favouriteIds] = await Promise.all([
    accounts().profile(userId),
    accounts().addresses(userId),
    accounts().orders(userId),
    accounts().favouriteCakeIds(userId),
  ]);
  return { profile: profile!, addresses, orders, favouriteIds };
}

/**
 * Turns a past order back into cart lines with today's cakes, sizes and prices. Lines whose cake,
 * size or choices no longer exist are skipped and named, so the customer knows (FR-027).
 */
export async function reorder(userId: string, orderId: string): Promise<Reorder | null> {
  const lines = await accounts().orderLines(userId, orderId);
  if (!lines) return null;
  const items: Reorder["items"] = [];
  const skipped: string[] = [];
  for (const line of lines) {
    const cake = line.cakeSlug ? await getCakeDetail(line.cakeSlug) : null;
    const size = cake?.sizes.find((s) => s.label === line.sizeLabel);
    const options = line.options.map((o) =>
      cake?.optionGroups.flatMap((g) => g.options).find((opt) => opt.name === o.name),
    );
    if (!cake || !cake.available || !size || options.some((o) => !o)) {
      skipped.push(line.cakeName);
      continue;
    }
    const picked = options.map((o) => o!);
    items.push({
      cakeId: cake.id,
      sizeId: size.id,
      optionIds: picked.map((o) => o.id),
      message: line.message,
      referencePhoto: null,
      quantity: line.quantity,
      snapshot: {
        cakeSlug: cake.slug,
        cakeName: cake.name,
        sizeLabel: size.label,
        choices: picked.map((o) => o.name),
        unitPrice: size.price + picked.reduce((sum, o) => sum + o.priceDelta, 0),
      },
    });
  }
  if (items.length === 0) return { items, skipped };
  // Re-check through the same rules as the cart, dropping anything the quote refuses.
  const quote = await quoteCartItems(items.map((item, i) => ({ ...item, id: `reorder-${i}` })));
  const ok = new Set(quote.lines.filter((l) => l.status === "ok").map((l) => l.itemId));
  items.forEach((item, i) => {
    if (!ok.has(`reorder-${i}`)) skipped.push(item.snapshot.cakeName);
  });
  return { items: items.filter((_, i) => ok.has(`reorder-${i}`)), skipped };
}
