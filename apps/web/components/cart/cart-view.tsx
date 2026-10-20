"use client";

import Link from "next/link";
import { useState } from "react";
import {
  formatCalendarDate,
  formatMoney,
  MAX_QUANTITY,
  type CartQuote,
  type QuoteLine,
} from "@cozycakes/core";
import { QuantityStepper } from "@/components/builder/quantity-stepper";
import { CakeArt } from "@/components/cake/cake-art";
import { cart, useCart, type StoredCartItem } from "@/lib/cart/store";
import { useCartQuote } from "@/lib/cart/use-quote";
import { site } from "@/lib/site";

/**
 * The cart's contents (FR-009, tasks T044), shared by the slide-in sheet and the `/cart` page.
 * Lines show the server's latest prices once quoted, and fall back to what the customer saw when
 * offline.
 */
export function CartView({ onNavigate }: { onNavigate?: () => void }) {
  const items = useCart();
  const { quote, status } = useCartQuote(items);

  if (items.length === 0) {
    return (
      <div className="px-2 py-10 text-center">
        <p aria-hidden="true" className="animate-float text-6xl">
          🥣
        </p>
        <p className="mt-4 font-display text-2xl font-semibold">Your cart is empty</p>
        <p className="mt-2 text-cocoa-700">Pick a cake and make it yours.</p>
        <Link
          href="/cakes"
          onClick={onNavigate}
          className="mt-6 inline-block rounded-[var(--radius-pill)] bg-cocoa-900 px-6 py-3 font-bold text-cream-50 transition-transform hover:-translate-y-0.5 active:scale-95"
        >
          Browse the cakes
        </Link>
      </div>
    );
  }

  const lineFor = (item: StoredCartItem) => quote?.lines.find((l) => l.itemId === item.id);
  // Current quantities times the latest known unit price; lines needing attention don't count.
  const subtotal = items.reduce((sum, item) => {
    const line = lineFor(item);
    if (line && line.status !== "ok") return sum;
    return sum + (line?.unitPrice ?? item.snapshot.unitPrice) * item.quantity;
  }, 0);

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-3" aria-label="Cakes in your cart">
        {items.map((item) => (
          <CartLine key={item.id} item={item} line={lineFor(item)} onNavigate={onNavigate} />
        ))}
      </ul>

      <div className="rounded-[var(--radius-lg)] bg-cream-100 p-4">
        <div className="flex items-baseline justify-between">
          <p className="font-bold">Subtotal</p>
          <p className="font-display text-2xl font-semibold" data-testid="cart-subtotal">
            {formatMoney(subtotal)}
          </p>
        </div>
        {quote?.earliestDate && (
          <p className="mt-1 text-sm text-cocoa-700">
            📅 Ready from {formatCalendarDate(quote.earliestDate)}. Delivery or pickup is chosen at
            checkout.
          </p>
        )}
        {status === "offline" && (
          <p className="mt-1 text-sm text-cocoa-700">
            You&rsquo;re offline, so these are the prices from when you added each cake.
          </p>
        )}
        <SendOrder items={items} quote={quote} subtotal={subtotal} />
      </div>
    </div>
  );
}

function CartLine({
  item,
  line,
  onNavigate,
}: {
  item: StoredCartItem;
  line: QuoteLine | undefined;
  onNavigate?: () => void;
}) {
  const { snapshot } = item;
  const problem = line && line.status !== "ok" ? line.issues[0] : null;
  const priceChanged = line?.status === "ok" && line.unitPrice !== snapshot.unitPrice;
  const unit = line?.status === "ok" ? line.unitPrice : snapshot.unitPrice;

  return (
    <li className="flex gap-3 rounded-[var(--radius-lg)] bg-white/80 p-3 ring-1 ring-cocoa-900/5">
      <CakeArt
        slug={snapshot.cakeSlug}
        flavour={snapshot.flavourTag}
        title={`Illustration of ${snapshot.cakeName}`}
        className="h-20 w-20 shrink-0 rounded-[var(--radius-md)]"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-lg font-semibold leading-tight">{snapshot.cakeName}</h3>
          <p className="shrink-0 font-bold">{formatMoney(unit * item.quantity)}</p>
        </div>
        <p className="text-sm text-cocoa-700">
          {[snapshot.sizeLabel, ...snapshot.choices].join(" · ")}
        </p>
        {item.message && (
          <p className="text-sm italic text-blush-700">&ldquo;{item.message}&rdquo;</p>
        )}
        {item.referencePhoto && <p className="text-sm text-cocoa-700">📸 Reference photo added</p>}
        {problem && (
          <p role="status" className="mt-1 text-sm font-bold text-blush-700">
            {problem}
          </p>
        )}
        {priceChanged && (
          <p role="status" className="mt-1 text-sm font-bold text-caramel-700">
            The price changed to {formatMoney(line.unitPrice)} each
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          <QuantityStepper
            value={item.quantity}
            max={MAX_QUANTITY}
            onChange={(q) => cart.setQuantity(item.id, q)}
            label={`Quantity of ${snapshot.cakeName}`}
          />
          {line?.status !== "unavailable" && (
            <Link
              href={`/cakes/${snapshot.cakeSlug}?edit=${item.id}`}
              onClick={onNavigate}
              className="rounded-[var(--radius-pill)] px-3 py-2 text-sm font-bold text-cocoa-700 underline-offset-4 hover:underline"
            >
              Edit<span className="sr-only"> {snapshot.cakeName}</span>
            </Link>
          )}
          <button
            type="button"
            onClick={() => cart.remove(item.id)}
            className="rounded-[var(--radius-pill)] px-3 py-2 text-sm font-bold text-cocoa-700 underline-offset-4 hover:underline"
          >
            Remove<span className="sr-only"> {snapshot.cakeName}</span>
          </button>
        </div>
      </div>
    </li>
  );
}

/**
 * Online checkout arrives with US3. Until then the cart copies a neat order summary and opens
 * Instagram, where the baker takes orders today (spec.md interim assumption).
 */
function SendOrder({
  items,
  quote,
  subtotal,
}: {
  items: StoredCartItem[];
  quote: CartQuote | null;
  subtotal: number;
}) {
  const [copied, setCopied] = useState(false);
  const blocked = quote?.lines.some((l) => l.status !== "ok") ?? false;

  const summary = () => {
    const lines = items.map((i) => {
      const parts = [i.snapshot.sizeLabel, ...i.snapshot.choices].join(", ");
      const message = i.message ? `, message: "${i.message}"` : "";
      const photo = i.referencePhoto ? `, photo: ${i.referencePhoto.url}` : "";
      return `${i.quantity} × ${i.snapshot.cakeName} (${parts}${message}${photo})`;
    });
    return [
      "Hi CozyCakes! I'd like to order:",
      ...lines,
      `Total: ${formatMoney(subtotal)}`,
      quote?.earliestDate ? `Earliest date: ${formatCalendarDate(quote.earliestDate)}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  };

  return (
    <div className="mt-4">
      <button
        type="button"
        disabled={blocked}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(summary());
            setCopied(true);
          } catch {
            setCopied(false);
          }
          window.open(site.instagramUrl, "_blank", "noopener");
        }}
        className="w-full rounded-[var(--radius-pill)] bg-cocoa-900 px-6 py-3 font-bold text-cream-50 transition-transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-50"
      >
        Copy my order &amp; message on Instagram
      </button>
      <p aria-live="polite" className="mt-2 text-center text-sm text-cocoa-700">
        {blocked
          ? "Fix or remove the highlighted cakes first."
          : copied
            ? "Copied! Paste it into the chat and I'll confirm your date."
            : "Online checkout is almost ready. Until then I confirm orders personally."}
      </p>
    </div>
  );
}
