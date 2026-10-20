import type { Metadata } from "next";
import Link from "next/link";
import { AdminNav } from "@/components/admin/admin-nav";
import { LogoMark } from "@/components/shell/logo";
import { signOut } from "../actions";

export const metadata: Metadata = {
  title: { default: "Kitchen", template: "%s · CozyCakes kitchen" },
  robots: { index: false, follow: false },
};

/** The owner's back office (US5): phone-first, same warm palette as the shop. */
export default function KitchenLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-cream-100">
      <header className="sticky top-0 z-30 border-b border-cocoa-900/5 bg-cream-100/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <Link href="/admin" className="flex items-center gap-2">
              <LogoMark className="h-8 w-8" />
              <span className="font-display text-xl font-semibold">
                CozyCakes <span className="italic text-blush-700">kitchen</span>
              </span>
            </Link>
            <div className="flex items-center gap-1">
              <Link
                href="/"
                className="whitespace-nowrap rounded-[var(--radius-pill)] px-3 py-2 text-sm font-bold text-cocoa-700 hover:bg-cream-200"
              >
                View shop
              </Link>
              <form action={signOut}>
                <button
                  type="submit"
                  className="whitespace-nowrap rounded-[var(--radius-pill)] px-3 py-2 text-sm font-bold text-cocoa-700 hover:bg-cream-200"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
          <AdminNav />
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-6 sm:px-6">
        {children}
      </main>
    </div>
  );
}
