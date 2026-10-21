"use client";

import { useSyncExternalStore } from "react";
import { CartItemSchema, MAX_CART_ITEMS } from "@cozycakes/core";
import { z } from "zod";

/**
 * Device-persisted cart (FR-009, data-model.md "Cart"). Items live in localStorage so the cart
 * survives reloads, visits and going offline; the server re-prices them on every quote. Each
 * item keeps a snapshot of what the customer saw, so the cart can render before (or without) a
 * quote.
 */

export const CartSnapshotSchema = z.object({
  cakeSlug: z.string(),
  cakeName: z.string(),
  flavourTag: z.string().optional(),
  sizeLabel: z.string(),
  choices: z.array(z.string()),
  unitPrice: z.number().int().nonnegative(),
});
export type CartSnapshot = z.infer<typeof CartSnapshotSchema>;

export const StoredCartItemSchema = CartItemSchema.extend({ snapshot: CartSnapshotSchema });
export type StoredCartItem = z.infer<typeof StoredCartItemSchema>;

const STORAGE_KEY = "cozycakes.cart.v1";
const EMPTY: StoredCartItem[] = [];

let items: StoredCartItem[] = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function read(): StoredCartItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = z.array(StoredCartItemSchema).safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : EMPTY;
  } catch {
    return EMPTY;
  }
}

function ensureLoaded() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  items = read();
  window.addEventListener("storage", (e) => {
    if (e.key !== STORAGE_KEY) return;
    items = read();
    listeners.forEach((l) => l());
  });
}

function commit(next: StoredCartItem[]) {
  items = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private mode or full storage: the cart still works for this visit.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  ensureLoaded();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  ensureLoaded();
  return items;
}

/** Cart items; empty during server rendering and the first hydration pass. */
export function useCart(): StoredCartItem[] {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}

export function cartCount(list: StoredCartItem[]) {
  return list.reduce((n, i) => n + i.quantity, 0);
}

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export const cart = {
  /** Adds a configured cake; returns its line id. */
  add(item: Omit<StoredCartItem, "id">): string {
    ensureLoaded();
    const id = newId();
    commit([...items, { ...item, id }].slice(-MAX_CART_ITEMS));
    return id;
  },
  replace(id: string, item: Omit<StoredCartItem, "id">) {
    ensureLoaded();
    commit(items.map((i) => (i.id === id ? { ...item, id } : i)));
  },
  setQuantity(id: string, quantity: number) {
    ensureLoaded();
    commit(items.map((i) => (i.id === id ? { ...i, quantity } : i)));
  },
  remove(id: string) {
    ensureLoaded();
    commit(items.filter((i) => i.id !== id));
  },
  /** Empties the cart once its cakes are ordered. */
  clear() {
    ensureLoaded();
    commit(EMPTY);
  },
  get(id: string): StoredCartItem | undefined {
    ensureLoaded();
    return items.find((i) => i.id === id);
  },
};

/** Lets any component (the builder, the nav) open the slide-in cart sheet. */
const OPEN_EVENT = "cozycakes:open-cart";
export function openCartSheet() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}
export function onOpenCartSheet(handler: () => void) {
  window.addEventListener(OPEN_EVENT, handler);
  return () => window.removeEventListener(OPEN_EVENT, handler);
}
