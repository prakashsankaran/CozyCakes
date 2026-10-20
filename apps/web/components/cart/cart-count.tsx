"use client";

import { cartCount, useCart } from "@/lib/cart/store";

/** Small badge with the number of cakes in the cart; bounces when it changes. */
export function CartCount({ className = "" }: { className?: string }) {
  const count = cartCount(useCart());
  if (count === 0) return null;
  return (
    <span
      key={count}
      className={`animate-pop grid h-5 min-w-5 place-items-center rounded-full bg-blush-700 px-1 text-xs font-bold text-cream-50 ${className}`}
    >
      {count}
      <span className="sr-only"> {count === 1 ? "cake" : "cakes"} in cart</span>
    </span>
  );
}
