import Link from "next/link";
import { Wordmark } from "./logo";

const links = [
  { href: "/cakes", label: "Cakes" },
  { href: "/#story", label: "Our story" },
  { href: "/cart", label: "Cart" },
];

export function BrandBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-cocoa-900/5 bg-cream-50/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="CozyCakes home">
          <Wordmark />
        </Link>
        <nav aria-label="Main" className="hidden sm:block">
          <ul className="flex items-center gap-2">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="rounded-[var(--radius-pill)] px-4 py-2 font-semibold text-cocoa-700 transition-colors hover:bg-blush-100 hover:text-cocoa-900"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
