import Link from "next/link";
import { site } from "@/lib/site";
import { LogoMark } from "./logo";

export function Footer() {
  return (
    <footer className="mt-24 bg-cocoa-900 text-cream-100">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 pb-32 pt-12 sm:grid-cols-[1.5fr_1fr] sm:px-6 sm:pb-12">
        <div>
          <div className="flex items-center gap-3">
            <LogoMark className="h-10 w-10" />
            <p className="font-display text-2xl">CozyCakes</p>
          </div>
          <p className="mt-4 max-w-sm text-cream-200">
            Every cake is baked to order in my home kitchen, with real butter, good chocolate and a
            lot of love.
          </p>
        </div>
        <div className="space-y-2">
          <p className="font-bold text-cream-50">Say hello</p>
          <Link href={site.instagramUrl} className="block underline-offset-4 hover:underline">
            Instagram {site.instagramHandle}
          </Link>
          <Link href="/cakes" className="block underline-offset-4 hover:underline">
            Browse all cakes
          </Link>
        </div>
      </div>
    </footer>
  );
}
