import { asc, eq, inArray } from "drizzle-orm";
import {
  DEFAULT_TIME_ZONE,
  type CakeRecord,
  type OptionGroup,
  type Tag,
  type TagType,
} from "@cozycakes/core";
import type { Database } from "../client";
import {
  bakerySettings,
  cakeOptionGroups,
  cakes,
  optionGroups,
  options,
  sizes,
  tags,
} from "../schema";

const PUBLIC_STATUSES = ["visible", "paused"] as const;

/** Reads the storefront catalog as domain records; storefront rules live in @cozycakes/core. */
export function catalogRepository(db: Database) {
  async function hydrate(rows: (typeof cakes.$inferSelect)[]): Promise<CakeRecord[]> {
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.id);

    const [sizeRows, linkRows] = await Promise.all([
      db.select().from(sizes).where(inArray(sizes.cakeId, ids)).orderBy(asc(sizes.sortOrder)),
      db
        .select()
        .from(cakeOptionGroups)
        .where(inArray(cakeOptionGroups.cakeId, ids))
        .orderBy(asc(cakeOptionGroups.sortOrder)),
    ]);

    const groupIds = [...new Set(linkRows.map((l) => l.groupId))];
    const [groupRows, optionRows] = groupIds.length
      ? await Promise.all([
          db.select().from(optionGroups).where(inArray(optionGroups.id, groupIds)),
          db
            .select()
            .from(options)
            .where(inArray(options.groupId, groupIds))
            .orderBy(asc(options.sortOrder)),
        ])
      : [[], []];

    const groupsById = new Map(groupRows.map((g) => [g.id, g]));

    return rows.map((cake) => {
      const optionGroupsForCake: OptionGroup[] = linkRows
        .filter((l) => l.cakeId === cake.id)
        .flatMap((link) => {
          const group = groupsById.get(link.groupId);
          if (!group) return [];
          const allowed = link.optionIds ? new Set(link.optionIds) : null;
          return [
            {
              id: group.id,
              name: group.name,
              kind: group.kind,
              required: group.required,
              maxSelect: group.maxSelect,
              options: optionRows
                .filter(
                  (o) => o.groupId === group.id && o.active && (!allowed || allowed.has(o.id)),
                )
                .map((o) => ({
                  id: o.id,
                  name: o.name,
                  priceDelta: o.priceDelta,
                  swatch: o.swatch,
                })),
            },
          ];
        });

      return {
        id: cake.id,
        slug: cake.slug,
        name: cake.name,
        tagline: cake.tagline,
        story: cake.story,
        photos: cake.photos,
        occasionTags: cake.occasionTags,
        dietaryTags: cake.dietaryTags,
        flavourTags: cake.flavourTags,
        leadTimeDays: cake.leadTimeDays,
        status: cake.status,
        featured: cake.featured,
        sortOrder: cake.sortOrder,
        sizes: sizeRows
          .filter((s) => s.cakeId === cake.id)
          .map((s) => ({
            id: s.id,
            label: s.label,
            serves: s.serves,
            price: s.price,
            active: s.active,
          })),
        optionGroups: optionGroupsForCake,
      };
    });
  }

  return {
    async listPublicCakes(): Promise<CakeRecord[]> {
      const rows = await db
        .select()
        .from(cakes)
        .where(inArray(cakes.status, [...PUBLIC_STATUSES]))
        .orderBy(asc(cakes.sortOrder));
      return hydrate(rows);
    },

    async getPublicCake(slug: string): Promise<CakeRecord | null> {
      const rows = await db.select().from(cakes).where(eq(cakes.slug, slug)).limit(1);
      const [cake] = await hydrate(rows.filter((r) => PUBLIC_STATUSES.includes(r.status as never)));
      return cake ?? null;
    },

    async listTags(type?: TagType): Promise<Tag[]> {
      const rows = await db
        .select()
        .from(tags)
        .where(type ? eq(tags.type, type) : undefined)
        .orderBy(asc(tags.sortOrder));
      return rows.map(({ slug, label, type: t, emoji }) => ({ slug, label, type: t, emoji }));
    },

    async getTimeZone(): Promise<string> {
      const [row] = await db
        .select({ timeZone: bakerySettings.timeZone })
        .from(bakerySettings)
        .limit(1);
      return row?.timeZone ?? DEFAULT_TIME_ZONE;
    },
  };
}

export type CatalogRepository = ReturnType<typeof catalogRepository>;
