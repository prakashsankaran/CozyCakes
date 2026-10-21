"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

const links = [
  { href: "/admin", label: "Today" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/menu", label: "Menu" },
  { href: "/admin/choices", label: "Choices" },
  { href: "/admin/dates", label: "Dates" },
  { href: "/admin/discounts", label: "Discounts" },
];

export function AdminNav() {
  return (
    <Suspense fallback={<NavLinks pathname={null} />}>
      <ActiveNav />
    </Suspense>
  );
}

function ActiveNav() {
  return <NavLinks pathname={usePathname()} />;
}

function NavLinks({ pathname }: { pathname: string | null }) {
  const active = (href: string) =>
    pathname !== null && (href === "/admin" ? pathname === href : pathname.startsWith(href));
  return (
    <nav aria-label="Back office" className="no-scrollbar -mx-4 overflow-x-auto px-4">
      <ul className="flex gap-2">
        {links.map((l) => (
          <li key={l.href} className="shrink-0">
            <Link
              href={l.href}
              aria-current={active(l.href) ? "page" : undefined}
              className={`block rounded-[var(--radius-pill)] px-4 py-2 font-bold transition-colors ${
                active(l.href)
                  ? "bg-cocoa-900 text-cream-50"
                  : "bg-white/70 text-cocoa-900 ring-1 ring-cocoa-900/10 hover:bg-cream-100"
              }`}
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
