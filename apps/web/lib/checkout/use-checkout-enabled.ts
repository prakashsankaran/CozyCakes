"use client";

import { useEffect, useState } from "react";

let cached: Promise<boolean> | null = null;

/**
 * Whether online checkout is switched on (Razorpay keys set). `null` while unknown. The answer is
 * fetched once per page load and shared by the cart and checkout.
 */
export function useCheckoutEnabled(): boolean | null {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  useEffect(() => {
    cached ??= fetch("/api/v1/checkout/config")
      .then(async (res) => ((await res.json()) as { enabled?: boolean }).enabled === true)
      .catch(() => {
        cached = null;
        return false;
      });
    let live = true;
    void cached.then((value) => live && setEnabled(value));
    return () => {
      live = false;
    };
  }, []);
  return enabled;
}
