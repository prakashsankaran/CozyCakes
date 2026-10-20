import type { Metadata } from "next";
import { CheckoutFlow } from "@/components/checkout/checkout-flow";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

/** Checkout (US3). The flow is client-side because the cart lives on the device (FR-009). */
export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 pt-8 sm:px-6 sm:pt-12">
      <p className="font-bold text-blush-700">Almost cake o&rsquo;clock</p>
      <h1 className="font-display text-4xl font-semibold sm:text-5xl">Checkout</h1>
      <div className="mt-6">
        <CheckoutFlow />
      </div>
    </div>
  );
}
