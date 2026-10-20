import { earliestFulfilmentDate, DEFAULT_TIME_ZONE } from "./dates";
import type { CakeDetail, OptionGroup } from "./schemas/catalog";
import {
  CAKE_MESSAGE_MAX,
  MAX_QUANTITY,
  REFERENCE_PHOTO_MAX_BYTES,
  REFERENCE_PHOTO_TYPES,
  type CakeConfig,
  type CartItem,
  type CartQuote,
  type QuoteLine,
} from "./schemas/cart";

/**
 * Pricing and cart validation (FR-006..FR-009). The builder and `POST /api/v1/cart/quote` both call
 * these functions with the same cake data, so the live price always equals the server's (FR-007).
 */

type Pricable = Pick<CakeDetail, "sizes" | "optionGroups">;

/** Size price plus the price of every chosen option the cake still offers. */
export function unitPrice(cake: Pricable, config: Pick<CakeConfig, "sizeId" | "optionIds">) {
  const size = cake.sizes.find((s) => s.id === config.sizeId);
  const chosen = new Set(config.optionIds);
  const extras = cake.optionGroups
    .flatMap((g) => g.options)
    .filter((o) => chosen.has(o.id))
    .reduce((sum, o) => sum + o.priceDelta, 0);
  return (size?.price ?? 0) + extras;
}

export function lineTotal(price: number, quantity: number) {
  return price * quantity;
}

export function selectedIn(group: OptionGroup, optionIds: string[]) {
  return group.options.filter((o) => optionIds.includes(o.id));
}

/** Everything wrong with a configuration, worded for the customer. Empty means valid. */
export function configurationIssues(cake: Pricable, config: CakeConfig): string[] {
  const issues: string[] = [];
  if (!cake.sizes.some((s) => s.id === config.sizeId)) issues.push("Pick a size");

  for (const group of cake.optionGroups) {
    const picked = selectedIn(group, config.optionIds);
    if (group.required && picked.length === 0) issues.push(`Pick a ${group.name.toLowerCase()}`);
    if (group.kind === "single" && picked.length > 1) {
      issues.push(`Pick just one ${group.name.toLowerCase()}`);
    }
    if (group.kind === "multi" && group.maxSelect !== null && picked.length > group.maxSelect) {
      issues.push(`Pick up to ${group.maxSelect} ${group.name.toLowerCase()}`);
    }
  }

  const offered = new Set(cake.optionGroups.flatMap((g) => g.options.map((o) => o.id)));
  if (config.optionIds.some((id) => !offered.has(id))) {
    issues.push("Some choices are no longer offered");
  }
  if (new Set(config.optionIds).size !== config.optionIds.length) {
    issues.push("A choice was picked twice");
  }
  if (config.message.length > CAKE_MESSAGE_MAX) {
    issues.push(`Keep the message to ${CAKE_MESSAGE_MAX} characters`);
  }
  if (config.quantity < 1 || config.quantity > MAX_QUANTITY) {
    issues.push(`Order between 1 and ${MAX_QUANTITY} of the same cake`);
  }
  return issues;
}

/** Human summary of the chosen options, in the order the builder shows them. */
export function describeChoices(cake: Pricable, optionIds: string[]): string[] {
  return cake.optionGroups.flatMap((g) => selectedIn(g, optionIds).map((o) => o.name));
}

export function quoteLine(cake: CakeDetail | null, item: CartItem): QuoteLine {
  if (!cake || !cake.available) {
    return {
      itemId: item.id,
      status: "unavailable",
      cakeSlug: cake?.slug ?? null,
      cakeName: cake?.name ?? null,
      sizeLabel: null,
      choices: [],
      message: item.message,
      unitPrice: 0,
      quantity: item.quantity,
      lineTotal: 0,
      issues: [
        cake ? `${cake.name} is taking a little break` : "This cake is no longer on the menu",
      ],
    };
  }
  const issues = configurationIssues(cake, item);
  const price = unitPrice(cake, item);
  return {
    itemId: item.id,
    status: issues.length ? "invalid" : "ok",
    cakeSlug: cake.slug,
    cakeName: cake.name,
    sizeLabel: cake.sizes.find((s) => s.id === item.sizeId)?.label ?? null,
    choices: describeChoices(cake, item.optionIds),
    message: item.message,
    unitPrice: price,
    quantity: item.quantity,
    lineTotal: issues.length ? 0 : lineTotal(price, item.quantity),
    issues,
  };
}

/** Re-prices a device cart against the live catalog (`POST /api/v1/cart/quote`). */
export function quoteCart(
  items: CartItem[],
  findCake: (id: string) => CakeDetail | null,
  ctx: { timeZone?: string; now?: Date } = {},
): CartQuote {
  const priced = items.map((item) => {
    const cake = findCake(item.cakeId);
    return { cake, line: quoteLine(cake, item) };
  });
  const lines = priced.map((p) => p.line);
  const ok = lines.filter((l) => l.status === "ok");
  const leadTimes = priced.filter((p) => p.line.status === "ok").map((p) => p.cake!.leadTimeDays);
  const leadTimeDays = leadTimes.length ? Math.max(...leadTimes) : null;
  return {
    lines,
    subtotal: ok.reduce((sum, l) => sum + l.lineTotal, 0),
    itemCount: ok.reduce((sum, l) => sum + l.quantity, 0),
    leadTimeDays,
    earliestDate:
      leadTimeDays === null
        ? null
        : earliestFulfilmentDate(leadTimeDays, ctx.timeZone ?? DEFAULT_TIME_ZONE, ctx.now),
  };
}

/** Friendly reason a reference photo can't be uploaded, or null when it's fine (FR-008). */
export function referencePhotoProblem(file: { type: string; size: number }): string | null {
  if (!(REFERENCE_PHOTO_TYPES as readonly string[]).includes(file.type)) {
    return "That file isn't a photo we can use. Try a JPG, PNG, WebP or HEIC image.";
  }
  if (file.size > REFERENCE_PHOTO_MAX_BYTES) {
    return "That photo is a bit big. Please choose one under 10 MB.";
  }
  return null;
}
