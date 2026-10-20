/**
 * Loads Razorpay's hosted checkout (research.md §6). Card, UPI and bank details are entered in
 * Razorpay's own window and never reach CozyCakes (FR-014).
 */

type RazorpaySuccess = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

export type RazorpayOptions = {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  prefill: { name: string; email: string; contact: string };
  theme: { color: string };
  handler: (response: RazorpaySuccess) => void;
  modal: { ondismiss: () => void };
};

type RazorpayInstance = { open(): void; on(event: "payment.failed", cb: () => void): void };
export type RazorpayConstructor = new (options: RazorpayOptions) => RazorpayInstance;

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

let loading: Promise<RazorpayConstructor> | null = null;

export function loadRazorpay(): Promise<RazorpayConstructor> {
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () =>
      window.Razorpay ? resolve(window.Razorpay) : reject(new Error("Razorpay missing"));
    script.onerror = () => {
      loading = null;
      reject(new Error("Couldn't load Razorpay"));
    };
    document.head.append(script);
  });
  return loading;
}
