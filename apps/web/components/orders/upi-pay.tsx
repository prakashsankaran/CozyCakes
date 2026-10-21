"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

const clock = new Intl.DateTimeFormat("en-IN", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});

/**
 * Paying a UPI order by hand (research.md §6): a QR code for paying from another device, a button
 * that opens a UPI app on this one, the UPI ID to copy, then "I've paid" so the baker knows to
 * look. The order is confirmed when the baker sees the money, not when this form is sent.
 */
export function UpiPay({
  token,
  amount,
  orderNumber,
  upi,
  qrCode,
}: {
  token: string;
  amount: string;
  orderNumber: string;
  upi: { upiId: string; payeeName: string; link: string; payBy: Date; claimed: boolean };
  /** SVG data URL of `upi.link`. */
  qrCode: string;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (upi.claimed) {
    return (
      <section
        aria-labelledby="upi-heading"
        className="animate-rise mt-8 rounded-[var(--radius-lg)] bg-pistachio-200 p-5"
      >
        <h2 id="upi-heading" className="font-display text-2xl font-semibold">
          Thank you for paying!
        </h2>
        <p className="mt-1">
          I’m checking my UPI app for your {amount}. This page turns to Confirmed as soon as I’ve
          seen it.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="upi-heading"
      className="animate-rise mt-8 rounded-[var(--radius-lg)] bg-white/70 p-5 shadow-[var(--shadow-lifted)] ring-2 ring-blush-400"
    >
      <h2 id="upi-heading" className="font-display text-2xl font-semibold">
        Pay {amount} by UPI
      </h2>
      <p className="mt-1 text-cocoa-700">
        Please pay by <strong>{clock.format(upi.payBy)}</strong>, or your date goes back on the
        calendar.
      </p>

      <div className="mt-4 grid items-center gap-5 sm:grid-cols-[11rem_1fr]">
        {/* eslint-disable-next-line @next/next/no-img-element -- generated SVG data URL */}
        <img
          src={qrCode}
          alt={`QR code to pay ${amount} to ${upi.payeeName} by UPI`}
          width={176}
          height={176}
          className="mx-auto h-44 w-44 rounded-[var(--radius-md)] bg-white p-2 ring-1 ring-cocoa-900/10"
        />
        <div className="grid gap-3">
          <a
            href={upi.link}
            className="rounded-[var(--radius-pill)] bg-cocoa-900 px-6 py-3 text-center font-bold text-cream-50 transition-transform hover:-translate-y-0.5 active:scale-95"
          >
            Open a UPI app to pay
          </a>
          <p className="text-sm text-cocoa-700">
            Or scan the code with GPay, PhonePe, Paytm or your bank’s app.
          </p>
          <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-md)] bg-cream-100 px-3 py-2">
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-bold text-cocoa-700">UPI ID</span>
              <span className="block break-all font-bold" data-testid="upi-id">
                {upi.upiId}
              </span>
            </span>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(upi.upiId).then(() => setCopied(true));
              }}
              className="rounded-[var(--radius-pill)] bg-white px-4 py-2 text-sm font-bold ring-1 ring-cocoa-900/15"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="text-sm text-cocoa-700">
            Paying to <strong>{upi.payeeName}</strong>. Add {orderNumber} as the note if your app
            asks.
          </p>
        </div>
      </div>

      <form
        aria-label="I've paid"
        className="mt-5 border-t border-cocoa-900/10 pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            setError(null);
            const res = await fetch(`/api/v1/orders/track/${token}/paid`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ reference }),
            });
            if (res.ok) {
              router.refresh();
              return;
            }
            const body = (await res.json().catch(() => null)) as {
              error?: { message?: string };
            } | null;
            setError(body?.error?.message ?? "Something went wrong. Please try again.");
            router.refresh();
          });
        }}
      >
        <label htmlFor="upi-reference" className="font-bold">
          UPI reference <span className="font-normal text-cocoa-700">(12 digits, optional)</span>
        </label>
        <p className="text-sm text-cocoa-700">It helps me find your payment quickly.</p>
        <input
          id="upi-reference"
          inputMode="numeric"
          autoComplete="off"
          maxLength={16}
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          aria-invalid={error ? true : undefined}
          className="mt-1 w-full max-w-xs rounded-[var(--radius-md)] bg-white px-4 py-3 text-base ring-1 ring-cocoa-900/20 focus:ring-2 focus:ring-blush-700 focus:outline-none aria-invalid:ring-2 aria-invalid:ring-blush-700"
        />
        {error && (
          <p role="alert" className="mt-2 font-bold text-blush-700">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="mt-3 block rounded-[var(--radius-pill)] bg-blush-400 px-6 py-3 font-bold text-cocoa-900 transition-transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-60"
        >
          {pending ? "Letting the baker know…" : "I’ve paid"}
        </button>
      </form>
    </section>
  );
}
