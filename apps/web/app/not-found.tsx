import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-xl flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <p className="text-7xl" aria-hidden="true">
        🍰
      </p>
      <h1 className="mt-6 font-display text-4xl font-semibold">Oops, someone ate this page</h1>
      <p className="mt-3 text-lg text-cocoa-700">
        The cake you&rsquo;re looking for isn&rsquo;t on the menu (any more).
      </p>
      <Link
        href="/cakes"
        className="mt-8 rounded-[var(--radius-pill)] bg-cocoa-900 px-7 py-4 font-bold text-cream-50"
      >
        See what&rsquo;s fresh
      </Link>
    </main>
  );
}
