import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { formatCalendarDate, formatMoney, type Tag } from "@cozycakes/core";
import { CakeBuilder } from "@/components/builder/cake-builder";
import { FavouriteButton } from "@/components/account/favourite-button";
import { CakeVisual } from "@/components/cake/cake-visual";
import { getCakeDetail, listTags, tagLabel } from "@/lib/catalog";
import { site } from "@/lib/site";
import { uploadsEnabled } from "@/lib/uploads";

export async function generateMetadata({ params }: PageProps<"/cakes/[slug]">): Promise<Metadata> {
  const cake = await getCakeDetail((await params).slug);
  return cake ? { title: cake.name, description: cake.tagline } : { title: "Cake not found" };
}

export default function CakePage({ params }: PageProps<"/cakes/[slug]">) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 sm:pt-10">
      <Link
        href="/cakes"
        className="inline-flex items-center gap-1 font-bold text-cocoa-700 hover:text-cocoa-900"
      >
        <span aria-hidden="true">←</span> All cakes
      </Link>
      <Suspense fallback={<DetailSkeleton />}>
        <CakeContent params={params} />
      </Suspense>
    </div>
  );
}

async function CakeContent({ params }: { params: PageProps<"/cakes/[slug]">["params"] }) {
  const { slug } = await params;
  const [cake, tags] = await Promise.all([getCakeDetail(slug), listTags()]);
  if (!cake) notFound();

  return (
    <article className="mt-6 grid gap-8 md:grid-cols-2 md:gap-12">
      <div className="relative md:sticky md:top-24 md:self-start">
        <CakeVisual
          cake={cake}
          priority
          sizes="(min-width: 768px) 50vw, 100vw"
          className="aspect-square rounded-[var(--radius-lg)] shadow-[var(--shadow-lifted)]"
        />
        <div className="absolute right-3 top-3">
          <FavouriteButton cakeId={cake.id} cakeName={cake.name} slug={cake.slug} />
        </div>
      </div>

      <div className="min-w-0 pb-8">
        <div className="animate-rise flex flex-wrap gap-2">
          {[...cake.occasionTags, ...cake.dietaryTags].map((t) => (
            <Badge key={t} tags={tags} slug={t} />
          ))}
        </div>
        <h1
          className="animate-rise mt-4 font-display text-4xl font-semibold leading-tight sm:text-5xl"
          style={{ ["--delay" as string]: "60ms" }}
        >
          {cake.name}
        </h1>
        <p
          className="animate-rise mt-3 text-xl text-cocoa-700"
          style={{ ["--delay" as string]: "120ms" }}
        >
          {cake.tagline}
        </p>

        <div
          className="animate-rise mt-6 flex flex-wrap items-center gap-3"
          style={{ ["--delay" as string]: "180ms" }}
        >
          {cake.startingPrice !== null && (
            <p className="text-lg">
              from{" "}
              <span className="font-display text-3xl font-semibold">
                {formatMoney(cake.startingPrice)}
              </span>
            </p>
          )}
          {cake.available ? (
            <p className="rounded-[var(--radius-pill)] bg-pistachio-200 px-4 py-2 text-sm font-bold">
              📅 Ready from {formatCalendarDate(cake.earliestDate)} · order {cake.leadTimeDays}{" "}
              {cake.leadTimeDays === 1 ? "day" : "days"} ahead
            </p>
          ) : (
            <p className="rounded-[var(--radius-pill)] bg-cocoa-900 px-4 py-2 text-sm font-bold text-cream-50">
              Back soon
            </p>
          )}
        </div>

        {cake.story && (
          <blockquote className="relative mt-8 rounded-[var(--radius-lg)] bg-blush-100 p-6 text-lg leading-relaxed">
            <span
              aria-hidden="true"
              className="absolute -top-5 left-5 font-display text-6xl leading-none text-blush-700"
            >
              &ldquo;
            </span>
            {cake.story}
            <footer className="mt-3 font-display italic text-blush-700">from the baker</footer>
          </blockquote>
        )}

        {cake.available ? (
          <CakeBuilder cake={cake} uploadsEnabled={uploadsEnabled()} />
        ) : (
          <PausedPanel />
        )}
      </div>
    </article>
  );
}

function Badge({ tags, slug }: { tags: Tag[]; slug: string }) {
  const tag = tags.find((t) => t.slug === slug);
  const dietary = tag?.type === "dietary";
  return (
    <span
      className={`rounded-[var(--radius-pill)] px-3 py-1 text-sm font-bold ${dietary ? "bg-pistachio-200" : "bg-caramel-200"}`}
    >
      {tag?.emoji ? `${tag.emoji} ` : ""}
      {tagLabel(tags, slug)}
    </span>
  );
}

/** Paused cakes ("Back soon", FR-004) can't be built or added to the cart. */
function PausedPanel() {
  return (
    <section className="mt-10 rounded-[var(--radius-lg)] bg-cocoa-900 p-6 text-cream-50">
      <h2 className="font-display text-2xl font-semibold">This one is taking a little break</h2>
      <p className="mt-2 text-cream-200">
        Follow along on Instagram to hear the moment it&rsquo;s back.
      </p>
      <Link
        href={site.instagramUrl}
        className="mt-5 inline-block rounded-[var(--radius-pill)] bg-blush-400 px-6 py-3 font-bold text-cocoa-900 transition-transform hover:-translate-y-0.5 active:scale-95"
      >
        Follow on Instagram
      </Link>
    </section>
  );
}

function DetailSkeleton() {
  return (
    <div className="mt-6 grid gap-8 md:grid-cols-2" role="status" aria-label="Loading cake">
      <div className="aspect-square animate-pulse rounded-[var(--radius-lg)] bg-cream-200" />
      <div className="space-y-4">
        <div className="h-10 w-3/4 animate-pulse rounded-full bg-cream-200" />
        <div className="h-5 w-full animate-pulse rounded-full bg-cream-100" />
        <div className="h-5 w-2/3 animate-pulse rounded-full bg-cream-100" />
      </div>
    </div>
  );
}
