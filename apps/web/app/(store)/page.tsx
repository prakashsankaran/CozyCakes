import Link from "next/link";
import { Suspense } from "react";
import { CakeArt } from "@/components/cake/cake-art";
import { CakeCard } from "@/components/cake/cake-card";
import { CardSkeleton } from "@/components/cake/skeletons";
import { getHome } from "@/lib/catalog";

export default function HomePage() {
  return (
    <>
      <Hero />
      <section aria-labelledby="occasions-title" className="mx-auto max-w-6xl px-4 pt-16 sm:px-6">
        <h2 id="occasions-title" className="font-display text-3xl font-semibold sm:text-4xl">
          What are we celebrating?
        </h2>
        <Suspense fallback={<div className="mt-6 h-28" />}>
          <Occasions />
        </Suspense>
      </section>

      <section aria-labelledby="featured-title" className="mx-auto max-w-6xl px-4 pt-16 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="font-bold uppercase tracking-[0.18em] text-blush-700">
              Fresh from the oven
            </p>
            <h2
              id="featured-title"
              className="mt-2 font-display text-3xl font-semibold sm:text-4xl"
            >
              This week&rsquo;s favourites
            </h2>
          </div>
          <Link
            href="/cakes"
            className="hidden shrink-0 font-bold text-cocoa-900 underline underline-offset-4 sm:block"
          >
            See every cake
          </Link>
        </div>
        <Suspense
          fallback={
            <div className="mt-8 flex gap-5 overflow-hidden">
              <CardSkeleton className="w-[78%] shrink-0 sm:w-[40%]" />
              <CardSkeleton className="w-[78%] shrink-0 sm:w-[40%]" />
            </div>
          }
        >
          <Featured />
        </Suspense>
      </section>

      <Story />
      <HowItWorks />
    </>
  );
}

function Hero() {
  return (
    <section className="grain overflow-hidden bg-gradient-to-b from-blush-100 via-cream-50 to-cream-50">
      <div className="mx-auto grid max-w-6xl items-center gap-6 px-4 pb-10 pt-8 sm:px-6 md:grid-cols-[1.1fr_1fr] md:pb-20 md:pt-16">
        <div>
          <p className="animate-rise inline-flex items-center gap-2 rounded-[var(--radius-pill)] bg-white/70 px-4 py-1.5 text-sm font-bold text-cocoa-700 ring-1 ring-cocoa-900/10">
            <span aria-hidden="true">🧁</span> Home-baked, made to order
          </p>
          <h1
            className="animate-rise mt-5 font-display text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl"
            style={{ ["--delay" as string]: "80ms", fontVariationSettings: '"SOFT" 100' }}
          >
            Baked slowly.
            <br />
            <span className="italic text-blush-700">Shared warmly.</span>
          </h1>
          <p
            className="animate-rise mt-5 max-w-md text-lg text-cocoa-700"
            style={{ ["--delay" as string]: "160ms" }}
          >
            Hi, I&rsquo;m the baker behind CozyCakes. Pick a cake, make it yours, and I&rsquo;ll
            bake it fresh for your special day.
          </p>
          <div
            className="animate-rise mt-8 flex flex-wrap gap-3"
            style={{ ["--delay" as string]: "240ms" }}
          >
            <Link
              href="/cakes"
              className="rounded-[var(--radius-pill)] bg-cocoa-900 px-7 py-4 text-lg font-bold text-cream-50 shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-0.5 active:scale-95"
            >
              Find your cake
            </Link>
            <Link
              href="/cakes/your-theme-cake"
              className="rounded-[var(--radius-pill)] bg-white/80 px-7 py-4 text-lg font-bold text-cocoa-900 ring-1 ring-cocoa-900/15 transition-transform hover:-translate-y-0.5 active:scale-95"
            >
              Dream up a theme cake
            </Link>
          </div>
        </div>

        <div className="relative mx-auto aspect-square w-full max-w-md">
          <div
            className="absolute inset-4 rotate-3 rounded-[48px] bg-caramel-200"
            aria-hidden="true"
          />
          <div
            className="animate-float absolute inset-4 overflow-hidden rounded-[48px] shadow-[var(--shadow-lifted)]"
            style={{ ["--r" as string]: "-2deg" }}
          >
            <CakeArt
              slug="cozy-hero"
              flavour="chocolate"
              title="Illustration of a layered chocolate cake with candles"
              className="h-full w-full"
            />
          </div>
          <Sprinkle className="left-0 top-6 bg-blush-400" delay={0} />
          <Sprinkle className="right-2 top-1/3 bg-pistachio-400" delay={400} />
          <Sprinkle className="bottom-6 left-8 bg-caramel-400" delay={800} />
          <p
            className="animate-float absolute -bottom-2 right-0 rotate-[-4deg] rounded-[var(--radius-md)] bg-white px-4 py-3 font-display text-lg italic shadow-[var(--shadow-soft)]"
            style={{ ["--delay" as string]: "600ms", ["--r" as string]: "-4deg" }}
          >
            fresh every morning ✨
          </p>
        </div>
      </div>
    </section>
  );
}

function Sprinkle({ className, delay }: { className: string; delay: number }) {
  return (
    <span
      aria-hidden="true"
      className={`animate-float absolute h-3 w-8 rounded-full ${className}`}
      style={{ ["--delay" as string]: `${delay}ms`, ["--r" as string]: `${delay / 20 - 20}deg` }}
    />
  );
}

async function Occasions() {
  const { occasions } = await getHome();
  const tints = ["bg-blush-200", "bg-caramel-200", "bg-pistachio-200", "bg-cream-200"];
  return (
    <ul className="no-scrollbar -mx-4 mt-6 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-4 sm:px-0">
      {occasions.map((o, i) => (
        <li key={o.slug} className="shrink-0">
          <Link
            href={`/cakes?occasion=${o.slug}`}
            className={`hover-wobble flex h-28 w-36 flex-col justify-between rounded-[var(--radius-md)] p-4 transition-transform hover:-translate-y-1 active:scale-95 sm:w-auto ${tints[i % tints.length]}`}
          >
            <span className="wobble-target text-3xl" aria-hidden="true">
              {o.emoji}
            </span>
            <span className="font-display text-lg font-semibold">{o.label}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

async function Featured() {
  const { featured } = await getHome();
  return (
    <ul className="no-scrollbar -mx-4 mt-8 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
      {featured.map((cake, i) => (
        <li key={cake.id} className="w-[78%] shrink-0 snap-center sm:w-[40%] lg:w-[31%]">
          <CakeCard cake={cake} priority={i === 0} index={i} />
        </li>
      ))}
    </ul>
  );
}

/** Placeholder copy written from the brand name; the baker should rewrite it in their own words. */
function Story() {
  return (
    <section
      id="story"
      aria-labelledby="story-title"
      className="mx-auto max-w-6xl scroll-mt-20 px-4 pt-20 sm:px-6"
    >
      <div className="grain relative overflow-hidden rounded-[var(--radius-lg)] bg-caramel-200 px-6 pb-40 pt-10 sm:px-12 sm:py-14">
        <div className="max-w-2xl">
          <p className="font-bold uppercase tracking-[0.18em] text-caramel-700">Our story</p>
          <h2 id="story-title" className="mt-3 font-display text-3xl font-semibold sm:text-5xl">
            A tiny kitchen with a big oven and an even bigger sweet tooth.
          </h2>
          <p className="mt-6 text-lg text-cocoa-700">
            CozyCakes started with birthday cakes for friends. Now I bake for celebrations all
            around town, still one cake at a time, still in my own kitchen. No preservatives, no
            shortcuts, just cakes that make people smile.
          </p>
          <p className="mt-6 font-display text-2xl italic text-blush-700">
            With love, from my oven to you
          </p>
        </div>
        <span
          aria-hidden="true"
          className="absolute -bottom-6 -right-4 rotate-12 text-[9rem] leading-none opacity-90 sm:text-[12rem]"
        >
          🎂
        </span>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      emoji: "💭",
      title: "Pick & personalise",
      body: "Choose a cake, then the size, flavour, frosting and a message.",
    },
    {
      emoji: "📅",
      title: "Choose your day",
      body: "Most cakes need two days' notice so I can bake them fresh.",
    },
    {
      emoji: "🎁",
      title: "Delivered or picked up",
      body: "I'll keep you posted at every step until it's in your hands.",
    },
  ];
  return (
    <section aria-labelledby="how-title" className="mx-auto max-w-6xl px-4 pt-20 sm:px-6">
      <h2 id="how-title" className="font-display text-3xl font-semibold sm:text-4xl">
        How it works
      </h2>
      <ol className="mt-8 grid gap-4 sm:grid-cols-3">
        {steps.map((s, i) => (
          <li
            key={s.title}
            className="rounded-[var(--radius-lg)] bg-white/70 p-6 ring-1 ring-cocoa-900/5"
          >
            <span className="text-4xl" aria-hidden="true">
              {s.emoji}
            </span>
            <p className="mt-4 text-sm font-bold text-blush-700">Step {i + 1}</p>
            <h3 className="font-display text-xl font-semibold">{s.title}</h3>
            <p className="mt-2 text-cocoa-700">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
