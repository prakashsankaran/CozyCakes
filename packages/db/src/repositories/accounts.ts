import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { MyOrder, SavedAddress } from "@cozycakes/core";
import type { Database } from "../client";
import { addresses, cakes, favourites, orderItems, orders, users } from "../schema";

const MAX_ADDRESSES = 10;

/** Customer accounts (US6, FR-027): profile, saved addresses, favourites and order history. */
export function accountsRepository(db: Database) {
  return {
    async profile(userId: string) {
      const [user] = await db
        .select({ email: users.email, name: users.name, phone: users.phone })
        .from(users)
        .where(eq(users.id, userId));
      return user ?? null;
    },

    /** Fills in the name and phone only where the account doesn't have them yet. */
    async rememberContact(userId: string, contact: { name: string; phone: string }) {
      await db
        .update(users)
        .set({
          name: sql`case when ${users.name} = '' then ${contact.name} else ${users.name} end`,
          phone: sql`case when ${users.phone} = '' then ${contact.phone} else ${users.phone} end`,
        })
        .where(eq(users.id, userId));
    },

    async updateProfile(userId: string, input: { name: string; phone: string }) {
      await db.update(users).set(input).where(eq(users.id, userId));
    },

    async addresses(userId: string): Promise<SavedAddress[]> {
      return db
        .select({
          id: addresses.id,
          label: addresses.label,
          line1: addresses.line1,
          line2: addresses.line2,
          landmark: addresses.landmark,
          city: addresses.city,
          postalCode: addresses.postalCode,
        })
        .from(addresses)
        .where(eq(addresses.userId, userId))
        .orderBy(asc(addresses.createdAt));
    },

    /** Saves an address unless the same one is already saved; keeps at most ten. */
    async saveAddress(
      userId: string,
      input: Omit<SavedAddress, "id">,
    ): Promise<{ id: string; created: boolean }> {
      const existing = await this.addresses(userId);
      const same = existing.find(
        (a) =>
          a.line1.toLowerCase() === input.line1.toLowerCase() && a.postalCode === input.postalCode,
      );
      if (same) return { id: same.id, created: false };
      if (existing.length >= MAX_ADDRESSES) {
        throw new Error("You can save up to 10 addresses. Remove one first.");
      }
      const [row] = await db
        .insert(addresses)
        .values({ userId, ...input })
        .returning({ id: addresses.id });
      return { id: row!.id, created: true };
    },

    async deleteAddress(userId: string, id: string) {
      await db.delete(addresses).where(and(eq(addresses.userId, userId), eq(addresses.id, id)));
    },

    async favouriteCakeIds(userId: string): Promise<string[]> {
      const rows = await db
        .select({ cakeId: favourites.cakeId })
        .from(favourites)
        .where(eq(favourites.userId, userId))
        .orderBy(desc(favourites.createdAt));
      return rows.map((r) => r.cakeId);
    },

    async setFavourite(userId: string, cakeId: string, on: boolean) {
      if (on) {
        await db.insert(favourites).values({ userId, cakeId }).onConflictDoNothing();
      } else {
        await db
          .delete(favourites)
          .where(and(eq(favourites.userId, userId), eq(favourites.cakeId, cakeId)));
      }
    },

    /**
     * Gives the account every order placed with its (verified) email address, including guest
     * orders from before it existed (US6 scenario 1).
     */
    async claimOrders(userId: string, email: string): Promise<number> {
      const claimed = await db
        .update(orders)
        .set({ userId })
        .where(
          and(isNull(orders.userId), sql`lower(${orders.contact}->>'email') = lower(${email})`),
        )
        .returning({ id: orders.id });
      return claimed.length;
    },

    async orders(userId: string): Promise<MyOrder[]> {
      const rows = await db
        .select()
        .from(orders)
        .where(eq(orders.userId, userId))
        .orderBy(desc(orders.date), desc(orders.createdAt));
      if (rows.length === 0) return [];
      const items = await db
        .select({
          orderId: orderItems.orderId,
          cakeName: orderItems.cakeName,
          sizeLabel: orderItems.sizeLabel,
          quantity: orderItems.quantity,
        })
        .from(orderItems)
        .where(
          inArray(
            orderItems.orderId,
            rows.map((r) => r.id),
          ),
        );
      return rows.map((o) => ({
        id: o.id,
        number: o.number,
        status: o.status,
        fulfilment: o.fulfilment,
        date: o.date,
        total: o.total,
        trackingToken: o.trackingToken,
        items: items
          .filter((i) => i.orderId === o.id)
          .map(({ cakeName, sizeLabel, quantity }) => ({ cakeName, sizeLabel, quantity })),
      }));
    },

    /** One of the customer's orders, with what each cake was, for ordering it again. */
    async orderLines(userId: string, orderId: string) {
      const [order] = await db
        .select({ id: orders.id })
        .from(orders)
        .where(and(eq(orders.id, orderId), eq(orders.userId, userId)));
      if (!order) return null;
      return db
        .select({
          cakeId: orderItems.cakeId,
          cakeName: orderItems.cakeName,
          cakeSlug: cakes.slug,
          sizeLabel: orderItems.sizeLabel,
          options: orderItems.options,
          message: orderItems.message,
          quantity: orderItems.quantity,
        })
        .from(orderItems)
        .leftJoin(cakes, eq(cakes.id, orderItems.cakeId))
        .where(eq(orderItems.orderId, orderId));
    },
  };
}
