"use client";

import { useEffect, useState } from "react";

export type CheckoutConfig = { enabled: boolean; method: "razorpay" | "test" | "upi" | null };

let cached: Promise<CheckoutConfig> | null = null;
const OFF: CheckoutConfig = { enabled: false, method: null };

/**
 * Whether online checkout is switched on (Razorpay keys or a UPI ID set) and how customers pay.
 * `null` while unknown. Fetched once per page load and shared by the cart and checkout.
 */
export function useCheckoutConfig(): CheckoutConfig | null {
  const [config, setConfig] = useState<CheckoutConfig | null>(null);
  useEffect(() => {
    cached ??= fetch("/api/v1/checkout/config")
      .then(async (res) => {
        const body = (await res.json()) as Partial<CheckoutConfig>;
        return body.enabled === true ? { enabled: true, method: body.method ?? null } : OFF;
      })
      .catch(() => {
        cached = null;
        return OFF;
      });
    let live = true;
    void cached.then((value) => live && setConfig(value));
    return () => {
      live = false;
    };
  }, []);
  return config;
}

/** Whether online checkout is switched on; `null` while unknown. */
export function useCheckoutEnabled(): boolean | null {
  return useCheckoutConfig()?.enabled ?? null;
}
