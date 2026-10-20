import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { formatCalendarDate, formatMoney } from "@cozycakes/core";
import { getOrderByTrackingToken } from "@/lib/checkout/service";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Your order", robots: { index: false } };

/**
 * The private order page (FR-016, FR-018): the celebratory confirmation right after paying, and
 * the link in the confirmation email. US4 adds the live status timeline.
 */
export default function OrderPage({ params }: PageProps<"/orders/[token]">) {
  return (
    <div className="mx-auto max-w-2xl px-4 pt-8 sm:px-6 sm:pt-12">
      <Suspense
        fallback={
          <div
            role="status"
            aria-label="Loading your order"
            className="h-96 animate-pulse rounded-[var(--radius-lg)] bg-cream-200"
          />
        }
      >
        <Order params={params} />
      </Suspense>
    </div>
  );
}

const SPRINKLES = [
  { left: "6%", color: "bg-blush-400", delay: 0, fall: 70, spin: 160 },
  { left: "18%", color: "bg-caramel-400", delay: 120, fall: 40, spin: -220 },
  { left: "31%", color: "bg-pistachio-400", delay: 60, fall: 90, spin: 260 },
  { left: "47%", color: "bg-blush-700", delay: 200, fall: 55, spin: -140 },
  { left: "62%", color: "bg-caramel-200", delay: 40, fall: 80, spin: 200 },
  { left: "74%", color: "bg-pistachio-400", delay: 160, fall: 45, spin: -260 },
  { left: "86%", color: "bg-blush-400", delay: 90, fall: 75, spin: 180 },
  { left: "94%", color: "bg-caramel-400", delay: 240, fall: 35, spin: -200 },
];

async function Order({ params }: { params: PageProps<"/orders/[token]">["params"] }) {
  const { token } = await params;
  const found = /^[\w-]{20,64}$/.test(token) ? await getOrderByTrackingToken(token) : null;
  if (!found) notFound();
  const { order, pickup } = found;
  const firstName = order.contactName.split(" ")[0];
  const how = order.fulfilment === "delivery" ? "Delivery" : "Pickup";
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

  return (
    <article>
      <div aria-hidden="true" className="relative h-20 overflow-hidden">
        {SPRINKLES.map((s, i) => (
          <span
            key={i}
            className={`animate-sprinkle absolute top-0 h-2 w-5 rounded-full ${s.color}`}
            style={
              {
                left: s.left,
                "--delay": `${s.delay}ms`,
                "--fall": `${s.fall}px`,
                "--spin": `${s.spin}deg`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
      <p className="animate-rise font-bold text-blush-700">Order {order.number}</p>
      <h1
        className="animate-rise font-display text-4xl font-semibold sm:text-5xl"
        style={{ "--delay": "80ms" } as React.CSSProperties}
      >
        Thank you, {firstName}!
      </h1>
      <p
        className="animate-rise mt-3 text-lg"
        style={{ "--delay": "160ms" } as React.CSSProperties}
      >
        Your cake is booked into my baking diary. I&rsquo;ll bake it fresh, just for you. A
        confirmation is on its way to your inbox.
      </p>

      <section
        aria-label="Order details"
        className="animate-rise mt-8 rounded-[var(--radius-lg)] bg-white/70 p-5 shadow-[var(--shadow-soft)] ring-1 ring-cocoa-900/5"
        style={{ "--delay": "240ms" } as React.CSSProperties}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-display text-xl font-semibold">
            {how} on {formatCalendarDate(order.date)}
          </p>
          <span className="rounded-[var(--radius-pill)] bg-pistachio-200 px-3 py-1 text-sm font-bold">
            {order.status === "confirmed" ? "Confirmed" : order.status.replace(/_/g, " ")}
          </span>
        </div>
        <p className="mt-1 text-cocoa-700">{order.slotLabel}</p>
        <p className="mt-3 text-sm">
          {order.fulfilment === "delivery"
            ? `🛵 To ${address}`
            : pickup.address
              ? `📍 ${pickup.address}${pickup.instructions ? `. ${pickup.instructions}` : ""}`
              : "📍 I'll message you the pickup address before the day."}
        </p>

        <ul className="mt-5 grid gap-3 border-t border-cocoa-900/10 pt-4">
          {order.items.map((item, i) => (
            <li key={i} className="flex justify-between gap-3">
              <span className="min-w-0">
                <span className="font-bold">
                  {item.quantity} × {item.cakeName}
                </span>
                <span className="block text-sm text-cocoa-700">
                  {[item.sizeLabel, ...item.options.map((o) => o.name)].join(", ")}
                  {item.message ? ` · “${item.message}”` : ""}
                </span>
              </span>
              <span className="shrink-0 font-bold">{formatMoney(item.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 grid grid-cols-[1fr_auto] gap-y-1 border-t border-cocoa-900/10 pt-3 text-sm">
          <dt>Subtotal</dt>
          <dd className="text-right">{formatMoney(order.subtotal)}</dd>
          {order.deliveryFee > 0 && (
            <>
              <dt>Delivery</dt>
              <dd className="text-right">{formatMoney(order.deliveryFee)}</dd>
            </>
          )}
          <dt className="mt-1 font-display text-lg font-semibold">Paid</dt>
          <dd className="mt-1 text-right font-display text-lg font-semibold">
            {formatMoney(order.total)}
          </dd>
        </dl>
      </section>

      <section className="animate-rise mt-8" style={{ "--delay": "320ms" } as React.CSSProperties}>
        <h2 className="font-display text-2xl font-semibold">What happens next</h2>
        <ol className="mt-3 grid gap-3">
          {[
            ["📬", "Your confirmation email has this page's link. Keep it handy."],
            ["🧁", "I bake your cake fresh, close to the day."],
            [
              order.fulfilment === "delivery" ? "🛵" : "🏡",
              order.fulfilment === "delivery"
                ? `It arrives on ${formatCalendarDate(order.date)}, ${order.slotLabel}.`
                : `Collect it on ${formatCalendarDate(order.date)}, ${order.slotLabel}.`,
            ],
          ].map(([emoji, text]) => (
            <li
              key={text}
              className="flex items-start gap-3 rounded-[var(--radius-md)] bg-cream-100 p-3"
            >
              <span aria-hidden="true" className="text-2xl">
                {emoji}
              </span>
              <span>{text}</span>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-sm text-cocoa-700">
          Questions? Message me on{" "}
          <a href={site.instagramUrl} className="font-bold underline">
            Instagram {site.instagramHandle}
          </a>{" "}
          and mention {order.number}.
        </p>
        <Link
          href="/cakes"
          className="mt-6 inline-block rounded-[var(--radius-pill)] bg-cocoa-900 px-6 py-3 font-bold text-cream-50 transition-transform hover:-translate-y-0.5 active:scale-95"
        >
          Back to the cakes
        </Link>
      </section>
    </article>
  );
}
