import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { formatCalendarDate, formatMoney, type CakeDetail, type Tag } from "@cozycakes/core";
import { CakeVisual } from "@/components/cake/cake-visual";
import { getCakeDetail, listTags, tagLabel } from "@/lib/catalog";
import { site } from "@/lib/site";

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
      <div className="md:sticky md:top-24 md:self-start">
        <CakeVisual
          cake={cake}
          priority
          sizes="(min-width: 768px) 50vw, 100vw"
          className="aspect-square rounded-[var(--radius-lg)] shadow-[var(--shadow-lifted)]"
        />
      </div>

      <div className="pb-8">
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

        {cake.sizes.length > 0 && (
          <section aria-labelledby="sizes-title" className="mt-10">
            <h2 id="sizes-title" className="font-display text-2xl font-semibold">
              Sizes
            </h2>
            <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {cake.sizes.map((s) => (
                <li
                  key={s.id}
                  className="rounded-[var(--radius-md)] bg-white/70 p-4 ring-1 ring-cocoa-900/10"
                >
                  <p className="font-display text-xl font-semibold">{s.label}</p>
                  <p className="text-sm text-cocoa-700">Serves {s.serves}</p>
                  <p className="mt-2 font-bold">{formatMoney(s.price)}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        <MakeItYours cake={cake} />
        <OrderPanel cake={cake} />
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

function MakeItYours({ cake }: { cake: CakeDetail }) {
  if (cake.optionGroups.length === 0) return null;
  return (
    <section aria-labelledby="options-title" className="mt-10">
      <h2 id="options-title" className="font-display text-2xl font-semibold">
        Make it yours
      </h2>
      <p className="mt-1 text-cocoa-700">
        Add a message on the cake, share a reference photo, and choose:
      </p>
      <dl className="mt-4 space-y-4">
        {cake.optionGroups.map((g) => (
          <div key={g.id}>
            <dt className="font-bold">{g.name}</dt>
            <dd className="mt-2 flex flex-wrap gap-2">
              {g.options.map((o) => (
                <span
                  key={o.id}
                  className="inline-flex items-center gap-2 rounded-[var(--radius-pill)] bg-white/70 px-3 py-1.5 text-sm ring-1 ring-cocoa-900/10"
                >
                  {o.swatch && (
                    <span
                      aria-hidden="true"
                      className="h-3.5 w-3.5 rounded-full ring-1 ring-cocoa-900/20"
                      style={{ background: o.swatch }}
                    />
                  )}
                  {o.name}
                  {o.priceDelta > 0 && (
                    <span className="text-cocoa-700">+{formatMoney(o.priceDelta)}</span>
                  )}
                </span>
              ))}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/**
 * Online ordering arrives with the builder and checkout (US2, US3). Until then the page points
 * customers to Instagram, where the baker takes orders today.
 */
function OrderPanel({ cake }: { cake: CakeDetail }) {
  return (
    <section className="mt-10 rounded-[var(--radius-lg)] bg-cocoa-900 p-6 text-cream-50">
      {cake.available ? (
        <>
          <h2 className="font-display text-2xl font-semibold">Online ordering is almost ready</h2>
          <p className="mt-2 text-cream-200">
            Until then, send me a message with the cake, size and date you&rsquo;d like and
            I&rsquo;ll confirm it personally.
          </p>
        </>
      ) : (
        <>
          <h2 className="font-display text-2xl font-semibold">This one is taking a little break</h2>
          <p className="mt-2 text-cream-200">
            Follow along on Instagram to hear the moment it&rsquo;s back.
          </p>
        </>
      )}
      <Link
        href={site.instagramUrl}
        className="mt-5 inline-block rounded-[var(--radius-pill)] bg-blush-400 px-6 py-3 font-bold text-cocoa-900 transition-transform hover:-translate-y-0.5 active:scale-95"
      >
        Message me on Instagram
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
