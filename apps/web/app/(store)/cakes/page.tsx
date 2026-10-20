import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CakeFilterQuerySchema, type CakeFilter } from "@cozycakes/core";
import { CakeCard } from "@/components/cake/cake-card";
import { FilterChips } from "@/components/cake/filter-chips";
import { CardGridSkeleton } from "@/components/cake/skeletons";
import { listCakeCards, listTags } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "All cakes",
  description: "Browse every CozyCakes creation by occasion, flavour or dietary need.",
};

export default function CakesPage({ searchParams }: PageProps<"/cakes">) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-12">
      <header className="max-w-2xl">
        <p className="animate-rise font-bold uppercase tracking-[0.18em] text-blush-700">
          The menu
        </p>
        <h1
          className="animate-rise mt-2 font-display text-4xl font-semibold sm:text-6xl"
          style={{ ["--delay" as string]: "60ms" }}
        >
          Every cake, baked just for you
        </h1>
        <p
          className="animate-rise mt-4 text-lg text-cocoa-700"
          style={{ ["--delay" as string]: "120ms" }}
        >
          Tap what you&rsquo;re celebrating or what you&rsquo;re craving.
        </p>
      </header>
      <Suspense fallback={<CardGridSkeleton />}>
        <FilteredCakes searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function FilteredCakes({
  searchParams,
}: {
  searchParams: PageProps<"/cakes">["searchParams"];
}) {
  const raw = await searchParams;
  const parsed = CakeFilterQuerySchema.safeParse({
    occasion: first(raw.occasion),
    dietary: first(raw.dietary),
    flavour: first(raw.flavour),
  });
  const filter: CakeFilter = parsed.success
    ? parsed.data
    : { occasion: [], dietary: [], flavour: [] };
  const [cakes, tags] = await Promise.all([listCakeCards(filter), listTags()]);

  return (
    <>
      <div className="sticky top-16 z-20 -mx-4 mt-6 bg-cream-50/90 px-4 py-3 backdrop-blur-md sm:mx-0 sm:px-0">
        <FilterChips tags={tags} filter={filter} />
      </div>
      <p className="sr-only" role="status">
        {cakes.length} {cakes.length === 1 ? "cake" : "cakes"} found
      </p>
      {cakes.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cakes.map((cake, i) => (
            <li key={cake.id} className={i === 0 && cakes.length > 2 ? "sm:col-span-2" : undefined}>
              <CakeCard
                cake={cake}
                size={i === 0 && cakes.length > 2 ? "large" : "regular"}
                priority={i === 0}
                index={i}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v.join(",") : v;
}

function EmptyState() {
  return (
    <div className="mt-10 rounded-[var(--radius-lg)] bg-white/70 px-6 py-12 text-center ring-1 ring-cocoa-900/5">
      <p className="text-5xl" aria-hidden="true">
        🥣
      </p>
      <h2 className="mt-4 font-display text-2xl font-semibold">
        Nothing in the mixing bowl for that combo
      </h2>
      <p className="mx-auto mt-2 max-w-md text-cocoa-700">
        Try removing a filter, or ask me for something custom. Most cakes can be made eggless.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href="/cakes"
          className="rounded-[var(--radius-pill)] bg-cocoa-900 px-6 py-3 font-bold text-cream-50"
        >
          Show all cakes
        </Link>
        <Link
          href="/cakes/your-theme-cake"
          className="rounded-[var(--radius-pill)] px-6 py-3 font-bold ring-1 ring-cocoa-900/20"
        >
          Design a theme cake
        </Link>
      </div>
    </div>
  );
}
