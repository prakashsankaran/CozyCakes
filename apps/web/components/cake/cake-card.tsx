import Link from "next/link";
import { formatCalendarDate, formatMoney, type CakeCard as CakeCardModel } from "@cozycakes/core";
import { CakeVisual } from "./cake-visual";

export function CakeCard({
  cake,
  size = "regular",
  priority,
  index = 0,
}: {
  cake: CakeCardModel;
  size?: "regular" | "large";
  priority?: boolean;
  index?: number;
}) {
  const large = size === "large";
  return (
    <Link
      href={`/cakes/${cake.slug}`}
      className={`group hover-wobble animate-rise block rounded-[var(--radius-lg)] bg-white/70 p-2 shadow-[var(--shadow-soft)] ring-1 ring-cocoa-900/5 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lifted)] focus-visible:-translate-y-1`}
      style={{ ["--delay" as string]: `${Math.min(index, 8) * 70}ms` }}
    >
      <div className="relative">
        <CakeVisual
          cake={cake}
          priority={priority}
          sizes={
            large
              ? "(min-width: 640px) 66vw, 100vw"
              : "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          }
          className={`wobble-target rounded-[calc(var(--radius-lg)-6px)] ${large ? "aspect-[4/3] sm:aspect-[16/9]" : "aspect-[5/4] sm:aspect-[4/5]"}`}
        />
        {!cake.available && (
          <span className="absolute left-3 top-3 rounded-[var(--radius-pill)] bg-cocoa-900 px-3 py-1 text-sm font-bold text-cream-50">
            Back soon
          </span>
        )}
        {cake.dietaryTags.includes("eggless") && (
          <span className="absolute right-3 top-3 rounded-[var(--radius-pill)] bg-pistachio-200 px-3 py-1 text-xs font-bold text-cocoa-900">
            🌱 Eggless option
          </span>
        )}
      </div>
      <div className="px-3 pb-3 pt-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3
            className={`font-display font-semibold leading-tight ${large ? "text-2xl sm:text-3xl" : "text-xl"}`}
          >
            {cake.name}
          </h3>
          {cake.startingPrice !== null && (
            <p className="shrink-0 text-sm text-cocoa-700">
              from{" "}
              <span className="font-bold text-cocoa-900">{formatMoney(cake.startingPrice)}</span>
            </p>
          )}
        </div>
        <p className="mt-1 text-cocoa-700">{cake.tagline}</p>
        {cake.available && (
          <p className="mt-3 text-sm font-semibold text-caramel-700">
            Ready from {formatCalendarDate(cake.earliestDate)}
          </p>
        )}
      </div>
    </Link>
  );
}
