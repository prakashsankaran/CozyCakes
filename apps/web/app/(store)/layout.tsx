import { BottomNav } from "@/components/shell/bottom-nav";
import { BrandBar } from "@/components/shell/brand-bar";
import { Footer } from "@/components/shell/footer";

export default function StoreLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded-[var(--radius-pill)] bg-cocoa-900 px-4 py-2 text-cream-50 focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <BrandBar />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
      <BottomNav />
    </>
  );
}
