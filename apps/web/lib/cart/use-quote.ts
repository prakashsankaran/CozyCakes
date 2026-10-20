"use client";

import { useEffect, useState } from "react";
import { CartItemSchema, CartQuoteSchema, type CartQuote } from "@cozycakes/core";
import type { StoredCartItem } from "./store";

type QuoteState = { status: "idle" | "loading" | "ready" | "offline"; quote: CartQuote | null };

/**
 * Re-prices the device cart with `POST /api/v1/cart/quote` whenever it changes, so the customer
 * sees the baker's current prices and any cakes that changed (spec edge case). Offline, the cart
 * falls back to the snapshots saved when each cake was added.
 */
export function useCartQuote(items: StoredCartItem[]): QuoteState {
  // Only the priced fields; parsing drops the display snapshot.
  const key = JSON.stringify(items.map((item) => CartItemSchema.parse(item)));
  const [result, setResult] = useState<{ key: string } & QuoteState>({
    key: "",
    status: "idle",
    quote: null,
  });

  useEffect(() => {
    if (key === "[]") return;
    const controller = new AbortController();
    fetch("/api/v1/cart/quote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items: JSON.parse(key) }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Quote failed: ${res.status}`);
        setResult({ key, status: "ready", quote: CartQuoteSchema.parse(await res.json()) });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        console.warn(err);
        setResult({ key, status: "offline", quote: null });
      });
    return () => controller.abort();
  }, [key]);

  if (items.length === 0) return { status: "idle", quote: null };
  // Keep showing the previous quote while a new one loads, so totals don't flicker.
  if (result.key !== key) return { status: "loading", quote: result.quote };
  return { status: result.status, quote: result.quote };
}
