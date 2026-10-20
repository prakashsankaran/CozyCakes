import type { ReactNode } from "react";

/** Small shared pieces for back-office screens. */

export function PageTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="font-display text-3xl font-semibold sm:text-4xl">{children}</h1>
      {action}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-[var(--radius-lg)] bg-cream-50 p-5 shadow-[var(--shadow-soft)] ring-1 ring-cocoa-900/5 ${className}`}
    >
      {children}
    </section>
  );
}

export function LoadingCards() {
  return (
    <div role="status" aria-label="Loading" className="mt-6 grid gap-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-24 animate-pulse rounded-[var(--radius-lg)] bg-cream-200" />
      ))}
    </div>
  );
}

export const buttonClass = {
  primary:
    "inline-flex items-center justify-center gap-2 rounded-[var(--radius-pill)] bg-cocoa-900 px-5 py-3 font-bold text-cream-50 transition-transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-60",
  soft: "inline-flex items-center justify-center gap-2 rounded-[var(--radius-pill)] bg-cream-200 px-4 py-2 font-bold text-cocoa-900 hover:bg-cream-300 disabled:opacity-50",
  quiet:
    "inline-flex items-center justify-center rounded-[var(--radius-pill)] px-3 py-2 text-sm font-bold text-cocoa-700 hover:bg-cream-200 disabled:opacity-40",
};

export const inputClass =
  "mt-1 w-full rounded-[var(--radius-sm)] bg-white px-3 py-2.5 ring-1 ring-cocoa-900/20 focus:outline-none focus:ring-2 focus:ring-blush-700";
