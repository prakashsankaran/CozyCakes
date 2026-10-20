import Image from "next/image";
import { ViewTransition } from "react";
import type { CakeCard } from "@cozycakes/core";
import { CakeArt } from "./cake-art";

/** Cover photo, or illustrated art until real photos exist. Morphs between card and detail. */
export function CakeVisual({
  cake,
  sizes,
  priority,
  className = "",
}: {
  cake: Pick<CakeCard, "slug" | "name" | "cover" | "flavourTags">;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <ViewTransition name={`cake-${cake.slug}`} share="morph" default="none">
      <div className={`relative overflow-hidden ${className}`}>
        {cake.cover ? (
          <Image
            src={cake.cover.url}
            alt={cake.cover.alt}
            fill
            sizes={sizes}
            priority={priority}
            className="object-cover"
          />
        ) : (
          <CakeArt
            slug={cake.slug}
            flavour={cake.flavourTags[0]}
            title={`Illustration of ${cake.name}`}
            className="absolute inset-0 h-full w-full"
          />
        )}
      </div>
    </ViewTransition>
  );
}
