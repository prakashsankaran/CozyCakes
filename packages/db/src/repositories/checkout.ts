import { and, asc, eq, gt, gte, inArray, isNull, lt, lte, ne, sql } from "drizzle-orm";
import {
  dayStatus,
  type AvailabilityRules,
  type CalendarDate,
  type CheckoutSnapshot,
  type CheckoutStatus,
  type DayOverride,
  type TimeSlot,
} from "@cozycakes/core";
import type { Database } from "../client";
import {
  bakerySettings,
  capacityHolds,
  checkouts,
  dayAvailability,
  deliveryZones,
  discountCodes,
  orderItems,
  orderNumberSeq,
  orderStatusEvents,
  orders,
  payments,
  timeSlots,
} from "../schema";

/** The chosen date can't take the order: full, a day off, or outside the allowed range. */
export class DateUnavailableError extends Error {
  constructor(readonly status: "full" | "blocked" | "too_soon") {
    super(`Date unavailable: ${status}`);
  }
}

export class CheckoutNotFoundError extends Error {}

export type BakeryRules = {
  timeZone: string;
  defaultDailyCapacity: number;
  bookingWindowDays: number;
  holdMinutes: number;
  pickupAddress: string;
  pickupInstructions: string;
  /** Empty when the baker hasn't set up UPI payments by hand. */
  upiId: string;
  upiName: string;
};

export type ConfirmedOrder = {
  orderId: string;
  number: string;
  trackingToken: string;
  /** False when this payment was already recorded (a repeated webhook or browser callback). */
  created: boolean;
  snapshot: CheckoutSnapshot;
};

export type OrderView = {
  number: string;
  status: typeof orders.$inferSelect.status;
  fulfilment: "delivery" | "pickup";
  date: string;
  slotLabel: string;
  contactName: string;
  /** For the server only (sending codes, saving details): never shown on the shared order page. */
  contactEmail: string;
  contactPhone: string;
  address: typeof orders.$inferSelect.address;
  noteToBaker: string;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  createdAt: Date;
  cancelReason: string | null;
  /** The customer said they've paid by UPI and the baker hasn't confirmed it yet. */
  upiClaimed: boolean;
  /** Each status reached, oldest first. */
  timeline: Array<{ status: typeof orders.$inferSelect.status; at: Date }>;
  items: Array<{
    cakeName: string;
    sizeLabel: string;
    options: Array<{ name: string; priceDelta: number }>;
    message: string;
    quantity: number;
    lineTotal: number;
  }>;
};

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

/** At least 128 bits of randomness for the private tracking link (data-model.md "Order"). */
function newTrackingToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Buffer.from(bytes).toString("base64url");
}

/**
 * Turns a checkout into an order: its cakes, its first status, the discount's use and the date's
 * place, which stops being a hold and becomes the order's.
 */
async function createOrder(
  tx: Tx,
  checkoutId: string,
  snapshot: CheckoutSnapshot,
  status: "confirmed" | "awaiting_payment",
) {
  const [{ n }] = (await tx.execute(
    sql`select nextval(${orderNumberSeq.seqName})::int as n`,
  )) as unknown as [{ n: number }];
  const [order] = await tx
    .insert(orders)
    .values({
      number: `CC-${n}`,
      trackingToken: newTrackingToken(),
      checkoutId,
      contact: snapshot.contact,
      fulfilment: snapshot.fulfilment,
      date: snapshot.date,
      slotId: snapshot.slotId,
      slotLabel: snapshot.slotLabel,
      address: snapshot.address,
      noteToBaker: snapshot.note,
      subtotal: snapshot.subtotal,
      deliveryFee: snapshot.deliveryFee,
      discount: snapshot.discount,
      discountCodeId: snapshot.discountCodeId ?? null,
      total: snapshot.total,
      status,
    })
    .returning();
  if (snapshot.discountCodeId) {
    // Counted once the order exists; a code may go one over its limit if two customers
    // pay for its last use at the same moment (research.md §17).
    await tx
      .update(discountCodes)
      .set({ redemptions: sql`${discountCodes.redemptions} + 1` })
      .where(eq(discountCodes.id, snapshot.discountCodeId));
  }
  await tx.insert(orderItems).values(
    snapshot.lines.map((l) => ({
      orderId: order!.id,
      cakeId: l.cakeId,
      cakeName: l.cakeName,
      sizeLabel: l.sizeLabel,
      options: l.options,
      message: l.message,
      referencePhotoUrl: l.referencePhotoUrl,
      unitPrice: l.unitPrice,
      quantity: l.quantity,
      lineTotal: l.lineTotal,
    })),
  );
  await tx.insert(orderStatusEvents).values({
    orderId: order!.id,
    fromStatus: null,
    toStatus: status,
    note: status === "confirmed" ? "Payment received" : "Waiting for UPI payment",
  });
  await tx
    .update(capacityHolds)
    .set({ convertedAt: new Date() })
    .where(eq(capacityHolds.checkoutId, checkoutId));
  return order!;
}

/**
 * Availability, checkouts and order creation (US3, research.md §7). A date's capacity is checked
 * and held in one transaction that locks that date's `day_availability` row, so two customers can
 * never take the last place at the same time.
 */
export function checkoutRepository(db: Database) {
  async function rules(q: Database | Tx = db): Promise<BakeryRules> {
    const [row] = await q.select().from(bakerySettings).where(eq(bakerySettings.id, 1));
    return {
      timeZone: row?.timeZone ?? "Asia/Kolkata",
      defaultDailyCapacity: row?.defaultDailyCapacity ?? 3,
      bookingWindowDays: row?.bookingWindowDays ?? 60,
      holdMinutes: row?.holdMinutes ?? 15,
      pickupAddress: row?.pickupAddress ?? "",
      pickupInstructions: row?.pickupInstructions ?? "",
      upiId: row?.upiId ?? "",
      upiName: row?.upiName ?? "",
    };
  }

  /** Confirmed (not cancelled) orders plus live holds, per date in [from, to]. */
  async function bookedBetween(q: Database | Tx, from: CalendarDate, to: CalendarDate) {
    const now = new Date();
    const [orderCounts, holdCounts] = await Promise.all([
      q
        .select({ date: orders.date, n: sql<number>`count(*)::int` })
        .from(orders)
        .where(and(gte(orders.date, from), lte(orders.date, to), ne(orders.status, "cancelled")))
        .groupBy(orders.date),
      q
        .select({ date: capacityHolds.date, n: sql<number>`count(*)::int` })
        .from(capacityHolds)
        .where(
          and(
            gte(capacityHolds.date, from),
            lte(capacityHolds.date, to),
            isNull(capacityHolds.convertedAt),
            gt(capacityHolds.expiresAt, now),
          ),
        )
        .groupBy(capacityHolds.date),
    ]);
    const booked: Record<CalendarDate, number> = {};
    for (const { date, n } of [...orderCounts, ...holdCounts]) {
      booked[date] = (booked[date] ?? 0) + n;
    }
    return booked;
  }

  async function overridesBetween(q: Database | Tx, from: CalendarDate, to: CalendarDate) {
    const rows = await q
      .select()
      .from(dayAvailability)
      .where(and(gte(dayAvailability.date, from), lte(dayAvailability.date, to)));
    return rows.map((r): DayOverride => ({
      date: r.date,
      blocked: r.blocked,
      capacityOverride: r.capacityOverride,
    }));
  }

  return {
    rules: () => rules(),

    /** Everything the calendar needs for dates in [from, to]. */
    async availability(from: CalendarDate, to: CalendarDate) {
      const [bakery, overrides, booked, slots] = await Promise.all([
        rules(),
        overridesBetween(db, from, to),
        bookedBetween(db, from, to),
        db.select().from(timeSlots).where(eq(timeSlots.active, true)).orderBy(asc(timeSlots.start)),
      ]);
      return {
        bakery,
        overrides,
        booked,
        slots: slots.map((s): TimeSlot => ({ id: s.id, label: s.label, fulfilment: s.fulfilment })),
      };
    },

    async findSlot(id: string): Promise<TimeSlot | null> {
      const [slot] = await db
        .select()
        .from(timeSlots)
        .where(and(eq(timeSlots.id, id), eq(timeSlots.active, true)));
      return slot ? { id: slot.id, label: slot.label, fulfilment: slot.fulfilment } : null;
    },

    /** The delivery fee for a PIN code, or null when the baker doesn't deliver there. */
    async deliveryFee(postalCode: string): Promise<number | null> {
      const [zone] = await db
        .select()
        .from(deliveryZones)
        .where(and(eq(deliveryZones.postalCode, postalCode), eq(deliveryZones.active, true)));
      return zone ? zone.fee : null;
    },

    /**
     * Holds a place on the snapshot's date and opens a checkout. Throws `DateUnavailableError`
     * when the date filled up, closed or is too soon (US3 scenario 5: before any charge).
     */
    async openCheckout(input: {
      snapshot: CheckoutSnapshot;
      today: CalendarDate;
      leadTimeDays: number;
    }): Promise<{ checkoutId: string; expiresAt: Date }> {
      const { snapshot } = input;
      return db.transaction(async (tx) => {
        // The date's row is the lock: create it if needed, then lock it for this transaction.
        await tx.insert(dayAvailability).values({ date: snapshot.date }).onConflictDoNothing();
        await tx.execute(
          sql`select 1 from ${dayAvailability} where ${dayAvailability.date} = ${snapshot.date} for update`,
        );
        const bakery = await rules(tx);
        const all: AvailabilityRules = {
          today: input.today,
          leadTimeDays: input.leadTimeDays,
          bookingWindowDays: bakery.bookingWindowDays,
          defaultDailyCapacity: bakery.defaultDailyCapacity,
          overrides: await overridesBetween(tx, snapshot.date, snapshot.date),
          booked: await bookedBetween(tx, snapshot.date, snapshot.date),
        };
        const day = dayStatus(snapshot.date, all);
        if (day.status !== "available") throw new DateUnavailableError(day.status);

        const expiresAt = new Date(Date.now() + bakery.holdMinutes * 60_000);
        const [checkout] = await tx
          .insert(checkouts)
          .values({ snapshot, expiresAt })
          .returning({ id: checkouts.id });
        const [hold] = await tx
          .insert(capacityHolds)
          .values({ date: snapshot.date, checkoutId: checkout!.id, expiresAt })
          .returning({ id: capacityHolds.id });
        await tx.update(checkouts).set({ holdId: hold!.id }).where(eq(checkouts.id, checkout!.id));
        return { checkoutId: checkout!.id, expiresAt };
      });
    },

    async attachProviderOrder(checkoutId: string, providerOrderId: string) {
      await db
        .update(checkouts)
        .set({ paymentProviderOrderId: providerOrderId })
        .where(eq(checkouts.id, checkoutId));
    },

    /** Gives the date's place back when payment could not even start. */
    async abandonCheckout(checkoutId: string) {
      await db.transaction(async (tx) => {
        await tx.update(checkouts).set({ status: "failed" }).where(eq(checkouts.id, checkoutId));
        await tx
          .delete(capacityHolds)
          .where(and(eq(capacityHolds.checkoutId, checkoutId), isNull(capacityHolds.convertedAt)));
      });
    },

    async checkout(checkoutId: string) {
      const [row] = await db.select().from(checkouts).where(eq(checkouts.id, checkoutId));
      return row ?? null;
    },

    async checkoutStatus(checkoutId: string): Promise<CheckoutStatus | null> {
      const [row] = await db
        .select({
          status: checkouts.status,
          expiresAt: checkouts.expiresAt,
          number: orders.number,
          trackingToken: orders.trackingToken,
        })
        .from(checkouts)
        .leftJoin(orders, eq(orders.checkoutId, checkouts.id))
        .where(eq(checkouts.id, checkoutId));
      if (!row) return null;
      const status =
        row.status === "open" && row.expiresAt.getTime() < Date.now() ? "expired" : row.status;
      return {
        status,
        orderNumber: row.number ?? null,
        trackingToken: row.trackingToken ?? null,
      };
    },

    /**
     * Turns a verified payment into a confirmed order, exactly once per payment (SC-006). Safe to
     * call from both the browser callback and the provider's webhook, in any order.
     */
    async confirmPayment(input: {
      provider: string;
      providerOrderId: string;
      providerPaymentId: string;
      amount: number | null;
      rawEvent?: unknown;
    }): Promise<ConfirmedOrder> {
      return db.transaction(async (tx) => {
        const [checkout] = await tx
          .select()
          .from(checkouts)
          .where(eq(checkouts.paymentProviderOrderId, input.providerOrderId))
          .for("update");
        if (!checkout) throw new CheckoutNotFoundError(input.providerOrderId);
        const snapshot = checkout.snapshot as CheckoutSnapshot;

        const existingOrder = async () => {
          const [order] = await tx.select().from(orders).where(eq(orders.checkoutId, checkout.id));
          return order;
        };

        const [seen] = await tx
          .select({ id: payments.id })
          .from(payments)
          .where(eq(payments.providerPaymentId, input.providerPaymentId));
        if (seen) {
          const order = await existingOrder();
          if (order) {
            return {
              orderId: order.id,
              number: order.number,
              trackingToken: order.trackingToken,
              created: false,
              snapshot,
            };
          }
        }

        const already = checkout.status === "paid" ? await existingOrder() : undefined;
        const order = already ?? (await createOrder(tx, checkout.id, snapshot, "confirmed"));
        await tx.update(checkouts).set({ status: "paid" }).where(eq(checkouts.id, checkout.id));

        if (!seen) {
          await tx.insert(payments).values({
            checkoutId: checkout.id,
            orderId: order.id,
            provider: input.provider,
            providerPaymentId: input.providerPaymentId,
            amount: input.amount ?? snapshot.total,
            status: "captured",
            rawEvent: input.rawEvent ?? null,
          });
        }

        return {
          orderId: order.id,
          number: order.number,
          trackingToken: order.trackingToken,
          created: !already,
          snapshot,
        };
      });
    },

    /**
     * UPI paid by hand (research.md §6): the order exists straight away, awaiting payment, and
     * keeps the date's place while the customer pays. A `created` payment row waits for the baker.
     */
    async placeUnpaidOrder(checkoutId: string): Promise<ConfirmedOrder> {
      return db.transaction(async (tx) => {
        const [checkout] = await tx
          .select()
          .from(checkouts)
          .where(and(eq(checkouts.id, checkoutId), eq(checkouts.status, "open")))
          .for("update");
        if (!checkout) throw new CheckoutNotFoundError(checkoutId);
        const snapshot = checkout.snapshot as CheckoutSnapshot;
        const order = await createOrder(tx, checkout.id, snapshot, "awaiting_payment");
        await tx.update(checkouts).set({ status: "paid" }).where(eq(checkouts.id, checkout.id));
        await tx.insert(payments).values({
          checkoutId: checkout.id,
          orderId: order.id,
          provider: "upi",
          providerPaymentId: `upi_${order.id}`,
          amount: snapshot.total,
          status: "created",
        });
        return {
          orderId: order.id,
          number: order.number,
          trackingToken: order.trackingToken,
          created: true,
          snapshot,
        };
      });
    },

    /**
     * The customer says they've paid by UPI. Null when the order isn't waiting for a UPI payment
     * (already confirmed, or released for want of one).
     */
    async claimUpiPayment(token: string, reference: string) {
      return db.transaction(async (tx) => {
        const [order] = await tx
          .select()
          .from(orders)
          .where(and(eq(orders.trackingToken, token), eq(orders.status, "awaiting_payment")))
          .for("update");
        if (!order) return null;
        const [payment] = await tx
          .update(payments)
          .set({ claimedAt: new Date(), reference: reference || null, updatedAt: new Date() })
          .where(
            and(
              eq(payments.orderId, order.id),
              eq(payments.provider, "upi"),
              eq(payments.status, "created"),
            ),
          )
          .returning();
        return payment ? { number: order.number, total: order.total, date: order.date } : null;
      });
    },

    /**
     * Gives back the dates of UPI orders nobody said they'd paid for by `cutoff` (their place
     * would otherwise stay taken forever). Returns the order numbers released.
     */
    async releaseUnpaidOrders(cutoff: Date): Promise<string[]> {
      return db.transaction(async (tx) => {
        const stale = await tx
          .select({ id: orders.id, number: orders.number })
          .from(orders)
          .innerJoin(payments, eq(payments.orderId, orders.id))
          .where(
            and(
              eq(orders.status, "awaiting_payment"),
              lt(orders.createdAt, cutoff),
              eq(payments.provider, "upi"),
              isNull(payments.claimedAt),
            ),
          )
          .for("update", { of: orders, skipLocked: true });
        if (stale.length === 0) return [];
        const ids = stale.map((o) => o.id);
        const reason =
          "No UPI payment arrived within the hour, so I let the date go. If you did pay, message me and I'll sort it out.";
        await tx
          .update(orders)
          .set({ status: "cancelled", cancelReason: reason, updatedAt: new Date() })
          .where(inArray(orders.id, ids));
        await tx
          .update(payments)
          .set({ status: "failed", updatedAt: new Date() })
          .where(and(inArray(payments.orderId, ids), eq(payments.status, "created")));
        await tx.insert(orderStatusEvents).values(
          ids.map((orderId) => ({
            orderId,
            fromStatus: "awaiting_payment" as const,
            toStatus: "cancelled" as const,
            note: reason,
          })),
        );
        return stale.map((o) => o.number);
      });
    },

    async orderByTrackingToken(token: string): Promise<OrderView | null> {
      const [order] = await db.select().from(orders).where(eq(orders.trackingToken, token));
      if (!order) return null;
      const [items, events, [claim]] = await Promise.all([
        db
          .select()
          .from(orderItems)
          .where(eq(orderItems.orderId, order.id))
          .orderBy(asc(orderItems.cakeName)),
        db
          .select({ status: orderStatusEvents.toStatus, at: orderStatusEvents.createdAt })
          .from(orderStatusEvents)
          .where(eq(orderStatusEvents.orderId, order.id))
          .orderBy(asc(orderStatusEvents.createdAt)),
        db
          .select({ claimedAt: payments.claimedAt })
          .from(payments)
          .where(
            and(
              eq(payments.orderId, order.id),
              eq(payments.provider, "upi"),
              eq(payments.status, "created"),
            ),
          )
          .limit(1),
      ]);
      return {
        number: order.number,
        status: order.status,
        fulfilment: order.fulfilment,
        date: order.date,
        slotLabel: order.slotLabel,
        contactName: order.contact.name,
        contactEmail: order.contact.email,
        contactPhone: order.contact.phone,
        address: order.address,
        noteToBaker: order.noteToBaker,
        subtotal: order.subtotal,
        deliveryFee: order.deliveryFee,
        discount: order.discount,
        total: order.total,
        createdAt: order.createdAt,
        cancelReason: order.cancelReason,
        upiClaimed: Boolean(claim?.claimedAt),
        timeline: events,
        items: items.map((i) => ({
          cakeName: i.cakeName,
          sizeLabel: i.sizeLabel,
          options: i.options,
          message: i.message,
          quantity: i.quantity,
          lineTotal: i.lineTotal,
        })),
      };
    },
  };
}
