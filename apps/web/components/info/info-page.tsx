import Link from "next/link";
import type { ReactNode } from "react";
import { business } from "@/lib/site";

export const INFO_PAGES = [
  { href: "/contact", label: "Contact" },
  { href: "/delivery", label: "Delivery and pickup" },
  { href: "/refunds", label: "Cancellations and refunds" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
] as const;

/** The shared frame for the contact and policy pages: a warm header, readable text, and links. */
export function InfoPage({
  emoji,
  title,
  intro,
  current,
  children,
}: {
  emoji: string;
  title: string;
  intro: ReactNode;
  current: (typeof INFO_PAGES)[number]["href"];
  children: ReactNode;
}) {
  return (
    <article className="mx-auto max-w-3xl px-4 pt-8 sm:px-6 sm:pt-12">
      <header className="grain relative overflow-hidden rounded-[var(--radius-lg)] bg-blush-100 px-6 py-8 sm:px-10 sm:py-10">
        <p aria-hidden="true" className="text-5xl">
          {emoji}
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold sm:text-5xl">{title}</h1>
        <div className="mt-3 max-w-xl text-lg text-cocoa-700">{intro}</div>
      </header>
      <div className="mt-8 grid gap-8 text-cocoa-900 [&_a]:font-bold [&_a]:underline [&_a]:underline-offset-4 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-semibold [&_li]:mt-1.5 [&_p]:mt-2 [&_section]:rounded-[var(--radius-lg)] [&_section]:bg-white/70 [&_section]:p-5 [&_section]:ring-1 [&_section]:ring-cocoa-900/5 sm:[&_section]:p-6 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5">
        {children}
      </div>
      <p className="mt-6 text-sm text-cocoa-700">Last updated {business.policiesUpdated}.</p>
      <nav aria-label="More about ordering" className="mt-6 flex flex-wrap gap-2">
        {INFO_PAGES.filter((p) => p.href !== current).map((p) => (
          <Link
            key={p.href}
            href={p.href}
            className="rounded-[var(--radius-pill)] px-4 py-2 text-sm font-bold ring-1 ring-cocoa-900/15 hover:bg-cream-200"
          >
            {p.label}
          </Link>
        ))}
      </nav>
    </article>
  );
}
