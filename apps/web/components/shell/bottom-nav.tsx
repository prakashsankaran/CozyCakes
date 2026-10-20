"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { CartCount } from "@/components/cart/cart-count";

const items = [
  {
    href: "/",
    label: "Home",
    icon: "M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z",
  },
  {
    href: "/cakes",
    label: "Cakes",
    icon: "M5 12h14v7a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1zm0 0c0-2 1.5-3 3.5-3h7c2 0 3.5 1 3.5 3M12 9V6m0 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3",
  },
  {
    href: "/cart",
    label: "Cart",
    icon: "M6 8h12l-1 11a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1zm3 0V7a3 3 0 0 1 6 0v1",
  },
  {
    href: "/me",
    label: "Me",
    icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8m-7 8c0-3.5 3-6 7-6s7 2.5 7 6",
  },
];

/** Thumb-reachable navigation for phones (XR-002); hidden from tablet width up. */
export function BottomNav() {
  // The active tab depends on the URL, so it streams in; the prerendered shell shows no active tab.
  return (
    <Suspense fallback={<NavList pathname={null} />}>
      <ActiveNav />
    </Suspense>
  );
}

function ActiveNav() {
  return <NavList pathname={usePathname()} />;
}

function NavList({ pathname }: { pathname: string | null }) {
  const isActive = (href: string) =>
    pathname !== null && (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-3 bottom-3 z-40 rounded-[var(--radius-lg)] bg-cocoa-900 px-2 pb-[env(safe-area-inset-bottom)] text-cream-50 shadow-[var(--shadow-lifted)] sm:hidden"
    >
      <ul className="grid h-[var(--bottom-nav-height)] grid-cols-4">
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <li key={item.href} className="flex">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className="relative flex flex-1 flex-col items-center justify-center gap-1 text-xs font-bold"
              >
                <span
                  className={`grid h-8 w-12 place-items-center rounded-[var(--radius-pill)] transition-all duration-300 ${
                    active ? "bg-blush-400 text-cocoa-900" : "text-cream-50"
                  }`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d={item.icon} />
                  </svg>
                </span>
                {item.label}
                {item.href === "/cart" && <CartCount className="absolute top-1.5 left-1/2 ml-2" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
