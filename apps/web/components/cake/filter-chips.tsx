import Link from "next/link";
import type { CakeFilter, Tag, TagType } from "@cozycakes/core";

const facets: Array<{ type: TagType; key: keyof CakeFilter; title: string }> = [
  { type: "occasion", key: "occasion", title: "Occasion" },
  { type: "dietary", key: "dietary", title: "Dietary" },
  { type: "flavour", key: "flavour", title: "Flavour" },
];

function hrefWith(filter: CakeFilter, key: keyof CakeFilter, slug: string): string {
  const next: CakeFilter = {
    ...filter,
    [key]: filter[key].includes(slug)
      ? filter[key].filter((s) => s !== slug)
      : [...filter[key], slug],
  };
  const params = new URLSearchParams();
  for (const f of facets) if (next[f.key].length) params.set(f.key, next[f.key].join(","));
  const qs = params.toString();
  return qs ? `/cakes?${qs}` : "/cakes";
}

/** Link-based toggles: work without JavaScript and keep filters shareable in the URL. */
export function FilterChips({ tags, filter }: { tags: Tag[]; filter: CakeFilter }) {
  const active = facets.some((f) => filter[f.key].length > 0);
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0">
      {facets.map((facet) =>
        tags
          .filter((t) => t.type === facet.type)
          .map((tag) => {
            const on = filter[facet.key].includes(tag.slug);
            return (
              <Link
                key={`${facet.type}-${tag.slug}`}
                href={hrefWith(filter, facet.key, tag.slug)}
                scroll={false}
                aria-label={`${facet.title}: ${tag.label}${on ? " (selected)" : ""}`}
                className={`shrink-0 rounded-[var(--radius-pill)] border px-4 py-2 text-sm font-bold transition-all duration-200 active:scale-95 ${
                  on
                    ? "border-cocoa-900 bg-cocoa-900 text-cream-50"
                    : "border-cocoa-900/15 bg-white/60 text-cocoa-900 hover:border-cocoa-900/40"
                }`}
              >
                {tag.emoji ? `${tag.emoji} ` : ""}
                {tag.label}
              </Link>
            );
          }),
      )}
      {active && (
        <Link
          href="/cakes"
          scroll={false}
          className="shrink-0 rounded-[var(--radius-pill)] px-4 py-2 text-sm font-bold text-blush-700 underline underline-offset-4"
        >
          Clear all
        </Link>
      )}
    </div>
  );
}
