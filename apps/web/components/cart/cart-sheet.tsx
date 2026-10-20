"use client";

import { usePathname } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { onOpenCartSheet } from "@/lib/cart/store";
import { CartView } from "./cart-view";

/**
 * Slide-in cart (XR-002, tasks T044): a modal sheet from the bottom on phones and from the right
 * on wider screens, opened after adding a cake so the customer never leaves the page. Built on
 * the native <dialog> for focus trapping, Escape and screen reader support.
 */
export function CartSheet() {
  const ref = useRef<HTMLDialogElement>(null);
  // The cart is only rendered (and quoted) while the sheet is open.
  const [open, setOpen] = useState(false);
  const close = () => ref.current?.close();

  useEffect(
    () =>
      onOpenCartSheet(() => {
        ref.current?.showModal();
        setOpen(true);
      }),
    [],
  );

  return (
    <dialog
      ref={ref}
      aria-labelledby="cart-sheet-title"
      onClose={() => setOpen(false)}
      onClick={(e) => {
        // A click on the backdrop lands on the dialog element itself.
        if (e.target === e.currentTarget) close();
      }}
      className="cart-sheet m-0 mt-auto max-h-[88dvh] w-full max-w-none overflow-y-auto rounded-t-[var(--radius-lg)] bg-cream-50 p-0 text-cocoa-900 shadow-[var(--shadow-lifted)] backdrop:bg-cocoa-900/40 backdrop:backdrop-blur-sm sm:ml-auto sm:mt-0 sm:h-dvh sm:max-h-none sm:w-[26rem] sm:rounded-none sm:rounded-l-[var(--radius-lg)]"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between bg-cream-50/95 px-5 py-4 backdrop-blur">
        <h2 id="cart-sheet-title" className="font-display text-2xl font-semibold">
          Your cart
        </h2>
        <button
          type="button"
          onClick={close}
          aria-label="Close cart"
          className="grid h-10 w-10 place-items-center rounded-full bg-cream-100 text-xl hover:bg-cream-200"
        >
          ×
        </button>
      </div>
      <div className="px-5 pb-8">{open && <CartView onNavigate={close} />}</div>
      <Suspense>
        <CloseOnNavigate close={close} />
      </Suspense>
    </dialog>
  );
}

function CloseOnNavigate({ close }: { close: () => void }) {
  const pathname = usePathname();
  // Closing a <dialog> on navigation is syncing with the DOM, not React state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => close(), [pathname]);
  return null;
}
