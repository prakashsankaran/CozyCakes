import { desc, eq, sql } from "drizzle-orm";
import type { DiscountRule, ParsedDiscountCodeInput } from "@cozycakes/core";
import type { Database } from "../client";
import { discountCodes } from "../schema";
import { AdminInputError } from "./admin";

export type StoredDiscount = DiscountRule & { id: string };

function toRule(row: typeof discountCodes.$inferSelect): StoredDiscount {
  return {
    id: row.id,
    code: row.code,
    type: row.type,
    value: row.value,
    minSubtotal: row.minSubtotal,
    startsOn: row.startsOn,
    endsOn: row.endsOn,
    maxRedemptions: row.maxRedemptions,
    redemptions: row.redemptions,
    active: row.active,
  };
}

/** Discount codes (FR-017): the baker's list, and lookups by what the customer typed. */
export function discountsRepository(db: Database) {
  return {
    async list(): Promise<StoredDiscount[]> {
      const rows = await db.select().from(discountCodes).orderBy(desc(discountCodes.createdAt));
      return rows.map(toRule);
    },

    /** The code a customer typed (already normalised), whatever its case in the database. */
    async find(code: string): Promise<StoredDiscount | null> {
      const [row] = await db
        .select()
        .from(discountCodes)
        .where(sql`lower(${discountCodes.code}) = lower(${code})`);
      return row ? toRule(row) : null;
    },

    /** Creates a code, or updates the one with `id`. Uses so far are never reset here. */
    async save(id: string | null, input: ParsedDiscountCodeInput): Promise<void> {
      const clash = await this.find(input.code);
      if (clash && clash.id !== id) {
        throw new AdminInputError(`There's already a code called ${input.code}`);
      }
      if (id) {
        const updated = await db
          .update(discountCodes)
          .set({ ...input, updatedAt: new Date() })
          .where(eq(discountCodes.id, id))
          .returning({ id: discountCodes.id });
        if (!updated.length) throw new AdminInputError("That code no longer exists");
      } else {
        await db.insert(discountCodes).values(input);
      }
    },

    async setActive(id: string, active: boolean): Promise<void> {
      await db
        .update(discountCodes)
        .set({ active, updatedAt: new Date() })
        .where(eq(discountCodes.id, id));
    },
  };
}
