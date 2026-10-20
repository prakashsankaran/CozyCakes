import type { Metadata } from "next";
import { ComingSoon } from "@/components/shell/coming-soon";

export const metadata: Metadata = { title: "Your cart" };

/** Placeholder until the cart lands with US2 (tasks T043–T044). */
export default function CartPage() {
  return (
    <ComingSoon
      emoji="🥣"
      title="Your cart is warming up"
      body="Building your own cake and checking out online is coming very soon. For now, have a look around and pick your favourite."
    />
  );
}
