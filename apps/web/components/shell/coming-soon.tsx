import Link from "next/link";

export function ComingSoon({ emoji, title, body }: { emoji: string; title: string; body: string }) {
  return (
    <div className="mx-auto max-w-xl px-4 pt-16 text-center sm:px-6">
      <p className="animate-float text-7xl" aria-hidden="true">
        {emoji}
      </p>
      <h1 className="mt-6 font-display text-4xl font-semibold">{title}</h1>
      <p className="mt-3 text-lg text-cocoa-700">{body}</p>
      <Link
        href="/cakes"
        className="mt-8 inline-block rounded-[var(--radius-pill)] bg-cocoa-900 px-7 py-4 font-bold text-cream-50 transition-transform hover:-translate-y-0.5 active:scale-95"
      >
        Browse the cakes
      </Link>
    </div>
  );
}
