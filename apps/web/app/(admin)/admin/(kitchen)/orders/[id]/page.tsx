import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import {
  ORDER_STATUS_COPY,
  formatCalendarDate,
  formatMoney,
  isFinalStatus,
  nextStatus,
} from "@cozycakes/core";
import { getDb, ordersRepository } from "@cozycakes/db";
import { OrderActions } from "@/components/admin/order-actions";
import { Card, LoadingCards, PageTitle, buttonClass } from "@/components/admin/ui";
import { StatusChip } from "@/components/orders/status-chip";
import { requireStaff } from "@/lib/admin/dal";

export const metadata: Metadata = { title: "Order" };

const when = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});

/** One order: everything needed to bake and hand it over, and the buttons to move it on. */
export default function OrderPage({ params }: PageProps<"/admin/orders/[id]">) {
  return (
    <Suspense
      fallback={
        <>
          <PageTitle>Order</PageTitle>
          <LoadingCards />
        </>
      }
    >
      <Detail params={params} />
    </Suspense>
  );
}

async function Detail({ params }: { params: PageProps<"/admin/orders/[id]">["params"] }) {
  const staff = await requireStaff();
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();
  const order = await ordersRepository(getDb()).detail(id.data);
  if (!order) notFound();

  const next = nextStatus(order.status, order.fulfilment);
  const address = order.address
    ? [
        order.address.line1,
        order.address.line2,
        order.address.landmark,
        order.address.city,
        order.address.postalCode,
      ]
        .filter(Boolean)
        .join(", ")
    : null;
  const refund = order.payment?.refunds.at(-1);

  return (
    <>
      <Link href="/admin/orders" className={`${buttonClass.quiet} -ml-3`}>
        ← All orders
      </Link>
      <PageTitle action={<StatusChip status={order.status} className="text-base" />}>
        {order.number}
      </PageTitle>
      <p className="mt-1 text-lg">
        {order.fulfilment === "delivery" ? "🛵 Delivery" : "🏡 Pickup"} on{" "}
        <strong>{formatCalendarDate(order.date)}</strong>, {order.slotLabel}
      </p>

      {!isFinalStatus(order.status) && (
        <OrderActions
          orderId={order.id}
          next={next ? { status: next, label: ORDER_STATUS_COPY[next].action } : null}
          canCancel={staff.role === "owner"}
          paidOnline={order.payment !== null}
          total={formatMoney(order.total)}
        />
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="font-display text-xl font-semibold">Cakes</h2>
          <ul className="mt-3 grid gap-4">
            {order.items.map((item) => (
              <li key={item.id} className="flex gap-3">
                {item.referencePhotoUrl && (
                  <a href={item.referencePhotoUrl} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element -- customer upload on Cloudinary */}
                    <img
                      src={item.referencePhotoUrl}
                      alt={`Reference photo for ${item.cakeName}`}
                      className="h-20 w-20 rounded-[var(--radius-sm)] object-cover"
                    />
                  </a>
                )}
                <div className="min-w-0">
                  <p className="font-bold">
                    {item.quantity} × {item.cakeName}, {item.sizeLabel}
                  </p>
                  {item.options.length > 0 && (
                    <p className="text-sm text-cocoa-700">
                      {item.options.map((o) => o.name).join(", ")}
                    </p>
                  )}
                  {item.message && (
                    <p className="mt-1 rounded-[var(--radius-sm)] bg-blush-100 px-2 py-1 text-sm">
                      On the cake: “{item.message}”
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {order.noteToBaker && (
            <p className="mt-4 border-t border-cocoa-900/10 pt-3 text-sm">
              <strong>Note:</strong> {order.noteToBaker}
            </p>
          )}
        </Card>

        <Card>
          <h2 className="font-display text-xl font-semibold">Customer</h2>
          <p className="mt-3 font-bold">{order.contact.name}</p>
          <p className="mt-1 flex flex-wrap gap-2">
            <a href={`tel:${order.contact.phone}`} className={buttonClass.soft}>
              📞 {order.contact.phone}
            </a>
            <a href={`mailto:${order.contact.email}`} className={buttonClass.soft}>
              ✉️ Email
            </a>
          </p>
          {address && <p className="mt-3 text-sm">🛵 {address}</p>}

          <dl className="mt-4 grid grid-cols-[1fr_auto] gap-y-1 border-t border-cocoa-900/10 pt-3 text-sm">
            <dt>Subtotal</dt>
            <dd className="text-right">{formatMoney(order.subtotal)}</dd>
            {order.deliveryFee > 0 && (
              <>
                <dt>Delivery</dt>
                <dd className="text-right">{formatMoney(order.deliveryFee)}</dd>
              </>
            )}
            {order.discount > 0 && (
              <>
                <dt>Discount</dt>
                <dd className="text-right">−{formatMoney(order.discount)}</dd>
              </>
            )}
            <dt className="font-bold">Paid</dt>
            <dd className="text-right font-bold">{formatMoney(order.total)}</dd>
          </dl>
          {refund && (
            <p
              className={`mt-3 rounded-[var(--radius-sm)] px-3 py-2 text-sm ${
                refund.providerRefundId ? "bg-pistachio-200" : "bg-blush-100"
              }`}
            >
              {refund.providerRefundId
                ? `Refund of ${formatMoney(refund.amount)} started.`
                : `The refund of ${formatMoney(refund.amount)} didn't go through. Refund it from your Razorpay dashboard.`}
            </p>
          )}
          {order.cancelReason && (
            <p className="mt-3 text-sm">
              <strong>Cancelled because:</strong> {order.cancelReason}
            </p>
          )}
        </Card>
      </div>

      <Card className="mt-4">
        <h2 className="font-display text-xl font-semibold">History</h2>
        <ol className="mt-3 grid gap-2">
          {order.events.map((event) => (
            <li key={event.id} className="flex flex-wrap items-baseline gap-x-2 text-sm">
              <span className="font-bold">{ORDER_STATUS_COPY[event.toStatus].label}</span>
              <span className="text-cocoa-700">
                {when.format(event.createdAt)} ·{" "}
                {event.actorUserId === null
                  ? "automatically"
                  : event.actorUserId === staff.userId
                    ? "by you"
                    : "by the kitchen"}
              </span>
              {event.note && event.toStatus !== "cancelled" && (
                <span className="text-cocoa-700">· {event.note}</span>
              )}
            </li>
          ))}
        </ol>
      </Card>
    </>
  );
}
