import { and, asc, desc, eq, gte, inArray, lt, notInArray, or } from "drizzle-orm";
import { canMoveOrder, type CalendarDate, type OrderStatus } from "@cozycakes/core";
import type { Database } from "../client";
import { orderItems, orderStatusEvents, orders, payments, refunds } from "../schema";

/** The move isn't allowed from the order's current status (someone else moved it first). */
export class OrderMoveError extends Error {
  constructor(readonly current: OrderStatus) {
    super(`Order can't move from ${current}`);
  }
}

export class OrderNotFoundError extends Error {}

type OrderRow = typeof orders.$inferSelect;

export type BoardOrder = Pick<
  OrderRow,
  "id" | "number" | "status" | "fulfilment" | "date" | "slotLabel" | "total" | "contact"
> & { items: Array<{ cakeName: string; sizeLabel: string; quantity: number }> };

export type OrderDetail = OrderRow & {
  items: Array<typeof orderItems.$inferSelect>;
  events: Array<typeof orderStatusEvents.$inferSelect>;
  payment: (typeof payments.$inferSelect & { refunds: Array<typeof refunds.$inferSelect> }) | null;
};

export type MovedOrder = Pick<
  OrderRow,
  | "id"
  | "number"
  | "trackingToken"
  | "contact"
  | "fulfilment"
  | "date"
  | "slotLabel"
  | "status"
  | "cancelReason"
  | "total"
> & { from: OrderStatus };

const FINISHED: OrderStatus[] = ["delivered", "collected", "cancelled"];

/**
 * Orders after payment (US4, FR-023, FR-024, FR-026): the baker's board, one order's details, and
 * status moves. Each move locks the order row and writes an `order_status_events` entry in the
 * same transaction, so two people tapping at once can't skip a step.
 */
export function ordersRepository(db: Database) {
  async function withItems(rows: OrderRow[]): Promise<BoardOrder[]> {
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
      )
      .orderBy(asc(orderItems.cakeName));
    return rows.map((r) => ({
      id: r.id,
      number: r.number,
      status: r.status,
      fulfilment: r.fulfilment,
      date: r.date,
      slotLabel: r.slotLabel,
      total: r.total,
      contact: r.contact,
      items: items.filter((i) => i.orderId === r.id),
    }));
  }

  return {
    /** Orders from today on, plus any earlier ones not yet finished, soonest first. */
    async upcoming(today: CalendarDate): Promise<BoardOrder[]> {
      const rows = await db
        .select()
        .from(orders)
        .where(or(gte(orders.date, today), notInArray(orders.status, FINISHED)))
        .orderBy(asc(orders.date), asc(orders.slotLabel), asc(orders.createdAt));
      return withItems(rows);
    },

    /** Finished orders before today, most recent first. */
    async past(today: CalendarDate, limit = 50): Promise<BoardOrder[]> {
      const rows = await db
        .select()
        .from(orders)
        .where(and(lt(orders.date, today), inArray(orders.status, FINISHED)))
        .orderBy(desc(orders.date), desc(orders.createdAt))
        .limit(limit);
      return withItems(rows);
    },

    async detail(orderId: string): Promise<OrderDetail | null> {
      const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
      if (!order) return null;
      const [items, events, [payment]] = await Promise.all([
        db.select().from(orderItems).where(eq(orderItems.orderId, orderId)),
        db
          .select()
          .from(orderStatusEvents)
          .where(eq(orderStatusEvents.orderId, orderId))
          .orderBy(asc(orderStatusEvents.createdAt)),
        db
          .select()
          .from(payments)
          .where(eq(payments.orderId, orderId))
          .orderBy(asc(payments.createdAt))
          .limit(1),
      ]);
      const paymentRefunds = payment
        ? await db.select().from(refunds).where(eq(refunds.paymentId, payment.id))
        : [];
      return {
        ...order,
        items,
        events,
        payment: payment ? { ...payment, refunds: paymentRefunds } : null,
      };
    },

    /** Moves an order to `to`, recording who did it (FR-026). */
    async move(input: {
      orderId: string;
      to: OrderStatus;
      actorUserId: string | null;
      note?: string | null;
    }): Promise<MovedOrder> {
      return db.transaction(async (tx) => {
        const [order] = await tx
          .select()
          .from(orders)
          .where(eq(orders.id, input.orderId))
          .for("update");
        if (!order) throw new OrderNotFoundError(input.orderId);
        if (!canMoveOrder(order.status, input.to, order.fulfilment)) {
          throw new OrderMoveError(order.status);
        }
        const cancelReason = input.to === "cancelled" ? (input.note ?? null) : order.cancelReason;
        await tx
          .update(orders)
          .set({ status: input.to, cancelReason, updatedAt: new Date() })
          .where(eq(orders.id, order.id));
        await tx.insert(orderStatusEvents).values({
          orderId: order.id,
          fromStatus: order.status,
          toStatus: input.to,
          actorUserId: input.actorUserId,
          note: input.note ?? null,
        });
        return {
          id: order.id,
          number: order.number,
          trackingToken: order.trackingToken,
          contact: order.contact,
          fulfilment: order.fulfilment,
          date: order.date,
          slotLabel: order.slotLabel,
          status: input.to,
          cancelReason,
          total: order.total,
          from: order.status,
        };
      });
    },

    /** The captured payment to refund for an order, if it was paid online. */
    async capturedPayment(orderId: string) {
      const [payment] = await db
        .select()
        .from(payments)
        .where(and(eq(payments.orderId, orderId), eq(payments.status, "captured")))
        .limit(1);
      return payment ?? null;
    },

    async recordRefund(input: {
      paymentId: string;
      amount: number;
      providerRefundId: string | null;
      status: string;
      reason: string;
    }) {
      await db.transaction(async (tx) => {
        await tx.insert(refunds).values(input);
        if (input.providerRefundId) {
          await tx
            .update(payments)
            .set({ status: "refunded", updatedAt: new Date() })
            .where(eq(payments.id, input.paymentId));
        }
      });
    },
  };
}
