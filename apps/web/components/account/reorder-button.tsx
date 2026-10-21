"use client";

import { useState, useTransition } from "react";
import { reorderAction } from "@/app/(store)/me/actions";
import { cart, openCartSheet } from "@/lib/cart/store";

/** Puts a past order's cakes back in the cart with today's prices (FR-027). */
export function ReorderButton({ orderId, number }: { orderId: string; number: string }) {
  const [pending, start] = useTransition();
  const [note, setNote] = useState<string | null>(null);
  return (
    <>
      <button
        type="button"
        disabled={pending}
        aria-label={`Order again: ${number}`}
        onClick={() =>
          start(async () => {
            const result = await reorderAction(orderId);
            if (!result.ok) {
              setNote(result.error);
              return;
            }
            for (const item of result.data.items) cart.add(item);
            setNote(
              result.data.skipped.length
                ? `${result.data.skipped.join(", ")} can't be made the same way any more.`
                : null,
            );
            if (result.data.items.length) openCartSheet();
          })
        }
        className="rounded-[var(--radius-pill)] bg-cocoa-900 px-4 py-2 text-sm font-bold text-cream-50 transition-transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-60"
      >
        {pending ? "Adding…" : "Order again"}
      </button>
      {note && (
        <p role="status" className="w-full text-sm font-bold text-blush-700">
          {note}
        </p>
      )}
    </>
  );
}
