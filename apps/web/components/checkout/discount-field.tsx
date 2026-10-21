"use client";

import { useEffect, useId, useState } from "react";
import { DiscountQuoteSchema, type CartItem, type DiscountQuote } from "@cozycakes/core";

type Props = {
  items: CartItem[];
  subtotal: number;
  applied: DiscountQuote | null;
  onChange: (discount: DiscountQuote | null) => void;
  /** Set when the server refused the code at payment time. */
  error: string | null;
  onError: (message: string | null) => void;
};

async function check(code: string, items: CartItem[]) {
  const res = await fetch("/api/v1/discounts/check", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code, items }),
  });
  const json = await res.json().catch(() => null);
  if (res.ok) return { ok: true as const, discount: DiscountQuoteSchema.parse(json) };
  return {
    ok: false as const,
    message: (json?.error?.message as string | undefined) ?? "We couldn't check that code.",
  };
}

/**
 * "Have a code?" in the order summary (FR-017). The code is checked against this cart right away
 * and again on the server when the customer pays, so the total they see is the total they pay.
 */
export function DiscountField({ items, subtotal, applied, onChange, error, onError }: Props) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);

  // The cart's subtotal changed (say, a cake was edited): re-check what the code is worth.
  useEffect(() => {
    if (!applied || subtotal === 0) return;
    let live = true;
    check(applied.code, items).then((result) => {
      if (!live) return;
      if (result.ok) {
        if (result.discount.amount !== applied.amount) onChange(result.discount);
      } else {
        onChange(null);
        onError(result.message);
      }
    });
    return () => {
      live = false;
    };
    // Only when the subtotal moves; `items` changes identity on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal]);

  async function apply() {
    if (!code.trim()) {
      onError("Enter a code");
      return;
    }
    setChecking(true);
    onError(null);
    const result = await check(code, items);
    setChecking(false);
    if (result.ok) {
      onChange(result.discount);
      setCode("");
      setOpen(false);
    } else onError(result.message);
  }

  if (applied) {
    return (
      <p className="mt-3 flex items-center justify-between gap-2 rounded-[var(--radius-md)] bg-blush-100 px-3 py-2 text-sm">
        <span>
          🎁 <strong>{applied.code}</strong> · {applied.description}
        </span>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="font-bold underline"
          aria-label={`Remove code ${applied.code}`}
        >
          Remove
        </button>
      </p>
    );
  }

  return (
    <div className="mt-3">
      {!open && !error ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-sm font-bold text-blush-700 underline"
        >
          Have a discount code?
        </button>
      ) : (
        <div>
          <label htmlFor={id} className="text-sm font-bold">
            Discount code
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id={id}
              value={code}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              maxLength={40}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${id}-error` : undefined}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void apply();
                }
              }}
              className="min-w-0 flex-1 rounded-[var(--radius-md)] bg-white px-3 py-2 uppercase tracking-wider ring-1 ring-cocoa-900/20 focus:ring-2 focus:ring-blush-700 focus:outline-none aria-invalid:ring-2 aria-invalid:ring-blush-700"
            />
            <button
              type="button"
              onClick={apply}
              disabled={checking}
              className="rounded-[var(--radius-pill)] bg-cocoa-900 px-4 py-2 text-sm font-bold text-cream-50 disabled:opacity-60"
            >
              {checking ? "Checking…" : "Apply"}
            </button>
          </div>
          {error && (
            <p id={`${id}-error`} className="mt-1 text-sm font-bold text-blush-700">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
