import type { Metadata } from "next";
import { CartView } from "@/components/cart/cart-view";

export const metadata: Metadata = { title: "Your cart" };

/** Full-page cart for the bottom bar's Cart tab; the same view slides in as a sheet elsewhere. */
export default function CartPage() {
  return (
    <div className="mx-auto max-w-xl px-4 pt-8 sm:px-6 sm:pt-12">
      <h1 className="font-display text-4xl font-semibold">Your cart</h1>
      <div className="mt-6">
        <CartView />
      </div>
    </div>
  );
}
