import { and, asc, eq, gte, inArray, isNotNull, ne, notInArray, or } from "drizzle-orm";
import { slotLabel } from "@cozycakes/core";
import type {
  BakerySettingsInput,
  UpiSettingsInput,
  CakeInput,
  CakeStatus,
  DayAvailabilityInput,
  DeliveryZoneInput,
  OptionGroupInput,
  TimeSlot,
  TimeSlotInput,
  Photo,
  Tag,
} from "@cozycakes/core";
import type { Database } from "../client";
import {
  bakerySettings,
  cakeOptionGroups,
  cakes,
  dayAvailability,
  deliveryZones,
  optionGroups,
  options,
  sizes,
  tags,
  timeSlots,
} from "../schema";

/** A friendly error the back office can show as-is. */
export class AdminInputError extends Error {}

export type AdminTimeSlot = TimeSlot & { start: string; end: string; active: boolean };

export type AdminCakeSummary = {
  id: string;
  slug: string;
  name: string;
  status: CakeStatus;
  featured: boolean;
  cover: Photo | null;
  sizeCount: number;
  startingPrice: number | null;
};

export type AdminCake = CakeInput & { id: string };

export type AdminOptionGroup = OptionGroupInput & { id: string; usedBy: number };

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

/**
 * Owner-only reads and writes for the back office (US5). Every catalog write marks the menu as
 * owner-managed, so deploys never reload the sample menu over the baker's cakes (tasks T083).
 */
export function adminRepository(db: Database) {
  async function markMenuOwned(tx: Tx) {
    await tx
      .insert(bakerySettings)
      .values({ id: 1, sampleMenuVersion: -1 })
      .onConflictDoUpdate({ target: bakerySettings.id, set: { sampleMenuVersion: -1 } });
  }

  async function uniqueSlug(slug: string, exceptId?: string) {
    const [clash] = await db
      .select({ id: cakes.id })
      .from(cakes)
      .where(eq(cakes.slug, slug))
      .limit(1);
    if (clash && clash.id !== exceptId) {
      throw new AdminInputError("Another cake already uses that web address");
    }
  }

  async function writeCakeChildren(tx: Tx, cakeId: string, input: CakeInput) {
    const keep = input.sizes.flatMap((s) => (s.id ? [s.id] : []));
    await tx
      .delete(sizes)
      .where(
        keep.length
          ? and(eq(sizes.cakeId, cakeId), notInArray(sizes.id, keep))
          : eq(sizes.cakeId, cakeId),
      );
    for (const [i, s] of input.sizes.entries()) {
      const values = {
        label: s.label,
        serves: s.serves,
        price: s.price,
        active: s.active,
        sortOrder: i,
      };
      if (s.id) {
        await tx
          .update(sizes)
          .set(values)
          .where(and(eq(sizes.id, s.id), eq(sizes.cakeId, cakeId)));
      } else {
        await tx.insert(sizes).values({ ...values, cakeId });
      }
    }

    await tx.delete(cakeOptionGroups).where(eq(cakeOptionGroups.cakeId, cakeId));
    if (input.optionGroupIds.length) {
      await tx
        .insert(cakeOptionGroups)
        .values(input.optionGroupIds.map((groupId, i) => ({ cakeId, groupId, sortOrder: i })));
    }
  }

  function cakeValues(input: CakeInput) {
    return {
      name: input.name,
      slug: input.slug,
      tagline: input.tagline,
      story: input.story,
      leadTimeDays: input.leadTimeDays,
      status: input.status,
      featured: input.featured,
      occasionTags: input.occasionTags,
      dietaryTags: input.dietaryTags,
      flavourTags: input.flavourTags,
      photos: input.photos,
    };
  }

  return {
    async listCakes(): Promise<AdminCakeSummary[]> {
      const [cakeRows, sizeRows] = await Promise.all([
        db.select().from(cakes).orderBy(asc(cakes.sortOrder), asc(cakes.name)),
        db.select().from(sizes),
      ]);
      return cakeRows.map((c) => {
        const own = sizeRows.filter((s) => s.cakeId === c.id && s.active);
        return {
          id: c.id,
          slug: c.slug,
          name: c.name,
          status: c.status,
          featured: c.featured,
          cover: c.photos[0] ?? null,
          sizeCount: own.length,
          startingPrice: own.length ? Math.min(...own.map((s) => s.price)) : null,
        };
      });
    },

    async getCake(id: string): Promise<AdminCake | null> {
      const [cake] = await db.select().from(cakes).where(eq(cakes.id, id)).limit(1);
      if (!cake) return null;
      const [sizeRows, links] = await Promise.all([
        db.select().from(sizes).where(eq(sizes.cakeId, id)).orderBy(asc(sizes.sortOrder)),
        db
          .select()
          .from(cakeOptionGroups)
          .where(eq(cakeOptionGroups.cakeId, id))
          .orderBy(asc(cakeOptionGroups.sortOrder)),
      ]);
      return {
        id: cake.id,
        ...cakeValues({ ...cake, sizes: [], optionGroupIds: [] }),
        sizes: sizeRows.map((s) => ({
          id: s.id,
          label: s.label,
          serves: s.serves,
          price: s.price,
          active: s.active,
        })),
        optionGroupIds: links.map((l) => l.groupId),
      };
    },

    async createCake(input: CakeInput): Promise<string> {
      await uniqueSlug(input.slug);
      return db.transaction(async (tx) => {
        const [first] = await tx
          .select({ sortOrder: cakes.sortOrder })
          .from(cakes)
          .orderBy(asc(cakes.sortOrder))
          .limit(1);
        const [row] = await tx
          .insert(cakes)
          .values({ ...cakeValues(input), sortOrder: (first?.sortOrder ?? 1) - 1 })
          .returning({ id: cakes.id });
        await writeCakeChildren(tx, row!.id, input);
        await markMenuOwned(tx);
        return row!.id;
      });
    },

    async updateCake(id: string, input: CakeInput): Promise<void> {
      await uniqueSlug(input.slug, id);
      await db.transaction(async (tx) => {
        const updated = await tx
          .update(cakes)
          .set(cakeValues(input))
          .where(eq(cakes.id, id))
          .returning({ id: cakes.id });
        if (!updated.length) throw new AdminInputError("That cake no longer exists");
        await writeCakeChildren(tx, id, input);
        await markMenuOwned(tx);
      });
    },

    async setCakeStatus(id: string, status: CakeStatus): Promise<void> {
      await db.transaction(async (tx) => {
        if (status === "visible") {
          const active = await tx
            .select({ id: sizes.id })
            .from(sizes)
            .where(and(eq(sizes.cakeId, id), eq(sizes.active, true)))
            .limit(1);
          if (!active.length) {
            throw new AdminInputError("Add a size before putting this cake on the menu");
          }
        }
        await tx.update(cakes).set({ status }).where(eq(cakes.id, id));
        await markMenuOwned(tx);
      });
    },

    /** Moves a cake one place up or down in the storefront order. */
    async moveCake(id: string, direction: "up" | "down"): Promise<void> {
      await db.transaction(async (tx) => {
        const rows = await tx
          .select({ id: cakes.id })
          .from(cakes)
          .orderBy(asc(cakes.sortOrder), asc(cakes.name));
        const from = rows.findIndex((r) => r.id === id);
        const to = direction === "up" ? from - 1 : from + 1;
        if (from < 0 || to < 0 || to >= rows.length) return;
        const order = rows.map((r) => r.id);
        [order[from], order[to]] = [order[to]!, order[from]!];
        for (const [i, cakeId] of order.entries()) {
          await tx.update(cakes).set({ sortOrder: i }).where(eq(cakes.id, cakeId));
        }
        await markMenuOwned(tx);
      });
    },

    async listOptionGroups(): Promise<AdminOptionGroup[]> {
      const [groups, optionRows, links] = await Promise.all([
        db.select().from(optionGroups).orderBy(asc(optionGroups.sortOrder)),
        db.select().from(options).orderBy(asc(options.sortOrder)),
        db.select({ groupId: cakeOptionGroups.groupId }).from(cakeOptionGroups),
      ]);
      return groups.map((g) => ({
        id: g.id,
        name: g.name,
        kind: g.kind,
        required: g.required,
        maxSelect: g.maxSelect,
        usedBy: links.filter((l) => l.groupId === g.id).length,
        options: optionRows
          .filter((o) => o.groupId === g.id)
          .map((o) => ({
            id: o.id,
            name: o.name,
            priceDelta: o.priceDelta,
            swatch: o.swatch,
            active: o.active,
          })),
      }));
    },

    async saveOptionGroup(input: OptionGroupInput): Promise<string> {
      return db.transaction(async (tx) => {
        const values = {
          name: input.name,
          kind: input.kind,
          required: input.required,
          maxSelect: input.kind === "multi" ? input.maxSelect : null,
        };
        let groupId = input.id;
        if (groupId) {
          await tx.update(optionGroups).set(values).where(eq(optionGroups.id, groupId));
        } else {
          const all = await tx.select({ id: optionGroups.id }).from(optionGroups);
          const [row] = await tx
            .insert(optionGroups)
            .values({ ...values, sortOrder: all.length + 1 })
            .returning({ id: optionGroups.id });
          groupId = row!.id;
        }
        const keep = input.options.flatMap((o) => (o.id ? [o.id] : []));
        await tx
          .delete(options)
          .where(
            keep.length
              ? and(eq(options.groupId, groupId), notInArray(options.id, keep))
              : eq(options.groupId, groupId),
          );
        for (const [i, o] of input.options.entries()) {
          const optionValues = {
            name: o.name,
            priceDelta: o.priceDelta,
            swatch: o.swatch,
            active: o.active,
            sortOrder: i,
          };
          if (o.id) {
            await tx
              .update(options)
              .set(optionValues)
              .where(and(eq(options.id, o.id), eq(options.groupId, groupId)));
          } else {
            await tx.insert(options).values({ ...optionValues, groupId });
          }
        }
        await markMenuOwned(tx);
        return groupId;
      });
    },

    async listTags(): Promise<Tag[]> {
      const rows = await db.select().from(tags).orderBy(asc(tags.type), asc(tags.sortOrder));
      return rows.map(({ slug, label, type, emoji }) => ({ slug, label, type, emoji }));
    },

    async getSettings(): Promise<BakerySettingsInput & { timeZone: string }> {
      const [row] = await db.select().from(bakerySettings).where(eq(bakerySettings.id, 1));
      return {
        timeZone: row?.timeZone ?? "Asia/Kolkata",
        defaultDailyCapacity: row?.defaultDailyCapacity ?? 3,
        bookingWindowDays: row?.bookingWindowDays ?? 60,
        pickupAddress: row?.pickupAddress ?? "",
        pickupInstructions: row?.pickupInstructions ?? "",
      };
    },

    async saveSettings(input: BakerySettingsInput): Promise<void> {
      await db
        .insert(bakerySettings)
        .values({ id: 1, ...input })
        .onConflictDoUpdate({ target: bakerySettings.id, set: input });
    },

    async getUpi(): Promise<UpiSettingsInput> {
      const [row] = await db.select().from(bakerySettings).where(eq(bakerySettings.id, 1));
      return { upiId: row?.upiId ?? "", upiName: row?.upiName ?? "" };
    },

    async saveUpi(input: UpiSettingsInput): Promise<void> {
      await db
        .insert(bakerySettings)
        .values({ id: 1, ...input })
        .onConflictDoUpdate({ target: bakerySettings.id, set: input });
    },

    async listDays(fromDate: string): Promise<DayAvailabilityInput[]> {
      const rows = await db
        .select()
        .from(dayAvailability)
        .where(
          and(
            gte(dayAvailability.date, fromDate),
            // Checkout also adds a row per booked day to lock it; only the baker's changes show.
            or(eq(dayAvailability.blocked, true), isNotNull(dayAvailability.capacityOverride)),
          ),
        )
        .orderBy(asc(dayAvailability.date));
      return rows.map((r) => ({
        date: r.date,
        blocked: r.blocked,
        capacityOverride: r.capacityOverride,
        note: r.note ?? "",
      }));
    },

    async saveDay(input: DayAvailabilityInput): Promise<void> {
      const values = {
        blocked: input.blocked,
        capacityOverride: input.capacityOverride,
        note: input.note || null,
      };
      await db
        .insert(dayAvailability)
        .values({ date: input.date, ...values })
        .onConflictDoUpdate({ target: dayAvailability.date, set: values });
    },

    async listZones(): Promise<DeliveryZoneInput[]> {
      const rows = await db.select().from(deliveryZones).orderBy(asc(deliveryZones.postalCode));
      return rows.map(({ postalCode, fee, active }) => ({ postalCode, fee, active }));
    },

    async saveZone(input: DeliveryZoneInput): Promise<void> {
      const values = { fee: input.fee, active: input.active };
      await db
        .insert(deliveryZones)
        .values({ postalCode: input.postalCode, ...values })
        .onConflictDoUpdate({ target: deliveryZones.postalCode, set: values });
    },

    async deleteZone(postalCode: string): Promise<void> {
      await db.delete(deliveryZones).where(eq(deliveryZones.postalCode, postalCode));
    },

    /** Every pickup and delivery time, including ones the baker stopped offering. */
    async listSlots(): Promise<AdminTimeSlot[]> {
      const rows = await db.select().from(timeSlots).orderBy(asc(timeSlots.start));
      return rows.map((s) => ({
        id: s.id,
        label: s.label,
        fulfilment: s.fulfilment,
        start: s.start.slice(0, 5),
        end: s.end.slice(0, 5),
        active: s.active,
      }));
    },

    /**
     * Adds a time. Times are never edited or deleted, so past orders keep pointing at the slot
     * they were booked in; the baker stops offering one and adds another instead.
     */
    async addSlot(input: { start: string; end: string; fulfilment: TimeSlotInput["fulfilment"] }) {
      const label = slotLabel(input.start, input.end);
      const [clash] = await db
        .select({ id: timeSlots.id })
        .from(timeSlots)
        .where(and(eq(timeSlots.label, label), eq(timeSlots.active, true)));
      if (clash) throw new AdminInputError(`You already offer ${label}`);
      await db.transaction(async (tx) => {
        // The times are the baker's now, so deploys must not reload the sample menu over them.
        await markMenuOwned(tx);
        await tx.insert(timeSlots).values({ ...input, label });
      });
    },

    async setSlotActive(id: string, active: boolean): Promise<void> {
      await db.transaction(async (tx) => {
        if (!active) {
          const others = await tx
            .select({ id: timeSlots.id })
            .from(timeSlots)
            .where(and(eq(timeSlots.active, true), ne(timeSlots.id, id)));
          if (!others.length) {
            throw new AdminInputError("Keep at least one time, or customers can't order");
          }
        }
        await markMenuOwned(tx);
        await tx
          .update(timeSlots)
          .set({ active, updatedAt: new Date() })
          .where(eq(timeSlots.id, id));
      });
    },

    async clearDays(dates: string[]): Promise<void> {
      if (dates.length)
        await db.delete(dayAvailability).where(inArray(dayAvailability.date, dates));
    },
  };
}
