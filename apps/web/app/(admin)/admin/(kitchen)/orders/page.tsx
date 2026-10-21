import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { addDays, formatCalendarDate, formatMoney, todayIn } from "@cozycakes/core";
import { adminRepository, getDb, ordersRepository, type BoardOrder } from "@cozycakes/db";
import { Card, LoadingCards, PageTitle } from "@/components/admin/ui";
import { StatusChip } from "@/components/orders/status-chip";
import { requireStaff } from "@/lib/admin/dal";
import { releaseUnpaidOrders } from "@/lib/checkout/service";

export const metadata: Metadata = { title: "Orders" };

/** The orders board (FR-023): what to bake, day by day, and where each order is. */
export default function OrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  return (
    <>
      <PageTitle>Orders</PageTitle>
      <Suspense fallback={<LoadingCards />}>
        <Board searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Board({
  searchParams,
}: {
  searchParams: PageProps<"/admin/orders">["searchParams"];
}) {
  await requireStaff();
  await releaseUnpaidOrders();
  const past = (await searchParams).view === "past";
  const { timeZone } = await adminRepository(getDb()).getSettings();
  const today = todayIn(timeZone);
  const repo = ordersRepository(getDb());
  const list = past ? await repo.past(today) : await repo.upcoming(today);

  const groups = new Map<string, BoardOrder[]>();
  for (const order of list) {
    const key = !past && order.date < today ? "late" : order.date;
    groups.set(key, [...(groups.get(key) ?? []), order]);
  }
  const heading = (key: string) =>
    key === "late"
      ? "Running late"
      : key === today
        ? `Today · ${formatCalendarDate(key)}`
        : key === addDays(today, 1)
          ? `Tomorrow · ${formatCalendarDate(key)}`
          : formatCalendarDate(key);
  const sorted = [...groups].sort(([a], [b]) => (a === "late" ? -1 : b === "late" ? 1 : 0));

  return (
    <>
      <nav aria-label="Which orders" className="mt-4 flex gap-2">
        {[
          { href: "/admin/orders", label: "Coming up", current: !past },
          { href: "/admin/orders?view=past", label: "Past", current: past },
        ].map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={tab.current ? "page" : undefined}
            className={`rounded-[var(--radius-pill)] px-4 py-2 text-sm font-bold ${
              tab.current
                ? "bg-blush-700 text-cream-50"
                : "bg-white/70 ring-1 ring-cocoa-900/10 hover:bg-cream-200"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {list.length === 0 ? (
        <Card className="mt-6 text-center">
          <p aria-hidden="true" className="text-4xl">
            {past ? "📖" : "🧁"}
          </p>
          <p className="mt-2 font-display text-xl font-semibold">
            {past ? "No finished orders yet" : "No orders coming up"}
          </p>
          <p className="mt-1 text-cocoa-700">
            {past
              ? "Delivered, collected and cancelled orders land here after their day."
              : "New orders appear here the moment the customer places them."}
          </p>
        </Card>
      ) : (
        <div className="mt-6 grid gap-8">
          {sorted.map(([key, orders]) => (
            <section key={key} aria-labelledby={`day-${key}`}>
              <h2
                id={`day-${key}`}
                className={`font-display text-xl font-semibold ${key === "late" ? "text-blush-700" : ""}`}
              >
                {heading(key)}{" "}
                <span className="font-sans text-base font-bold text-cocoa-700">
                  · {orders.length} {orders.length === 1 ? "order" : "orders"}
                </span>
              </h2>
              <ul className="mt-3 grid gap-3 md:grid-cols-2">
                {orders.map((order) => (
                  <li key={order.id}>
                    <OrderCard order={order} showDate={key === "late" || past} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}

function OrderCard({ order, showDate }: { order: BoardOrder; showDate: boolean }) {
  return (
    <Link
      href={`/admin/orders/${order.id}`}
      aria-label={`Order ${order.number} for ${order.contact.name}`}
      className="block rounded-[var(--radius-lg)] bg-cream-50 p-4 shadow-[var(--shadow-soft)] ring-1 ring-cocoa-900/5 transition-transform hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold">
            {order.contact.name} <span className="text-sm text-cocoa-700">· {order.number}</span>
          </p>
          <p className="text-sm text-cocoa-700">
            {order.fulfilment === "delivery" ? "🛵 Delivery" : "🏡 Pickup"}
            {showDate ? ` · ${formatCalendarDate(order.date)}` : ""} · {order.slotLabel}
          </p>
        </div>
        <StatusChip status={order.status} />
      </div>
      <ul className="mt-3 text-sm">
        {order.items.map((item, i) => (
          <li key={i}>
            {item.quantity} × {item.cakeName}, {item.sizeLabel}
          </li>
        ))}
      </ul>
      <p className="mt-2 flex items-baseline justify-between gap-2">
        <span className="text-sm font-bold text-caramel-700">
          {order.status === "awaiting_payment" &&
            (order.upiClaimed ? "📲 Says they’ve paid: check UPI" : "Not paid yet")}
        </span>
        <span className="font-bold">{formatMoney(order.total)}</span>
      </p>
    </Link>
  );
}
