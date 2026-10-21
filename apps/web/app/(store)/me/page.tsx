import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { formatCalendarDate, formatMoney } from "@cozycakes/core";
import { AccountDetails } from "@/components/account/account-details";
import { CodeSignIn } from "@/components/account/code-sign-in";
import { ReorderButton } from "@/components/account/reorder-button";
import { CakeCard } from "@/components/cake/cake-card";
import { StatusChip } from "@/components/orders/status-chip";
import { accountOverview } from "@/lib/account/service";
import { currentCustomer } from "@/lib/account/session";
import { listCakeCards } from "@/lib/catalog";
import { signOutCustomer } from "./actions";

export const metadata: Metadata = { title: "Your account", robots: { index: false } };

/** The customer's cozy corner (US6, FR-027): orders, favourites and saved details. */
export default function MePage({ searchParams }: PageProps<"/me">) {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-8 sm:px-6 sm:pt-12">
      <Suspense
        fallback={
          <div
            role="status"
            aria-label="Loading your account"
            className="h-96 animate-pulse rounded-[var(--radius-lg)] bg-cream-200"
          />
        }
      >
        <Account searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Account({ searchParams }: { searchParams: PageProps<"/me">["searchParams"] }) {
  const params = await searchParams;
  const me = await currentCustomer();
  const next = typeof params.next === "string" ? params.next : undefined;

  if (!me) {
    return (
      <div className="mx-auto max-w-md">
        <p aria-hidden="true" className="animate-float text-6xl">
          🧁
        </p>
        <h1 className="mt-4 font-display text-4xl font-semibold">Your cozy corner</h1>
        <p className="mt-2 text-lg text-cocoa-700">
          {params.reason === "favourite"
            ? "Sign in to keep your favourite cakes, on every device."
            : "Sign in to see your orders, order a favourite again in one tap, and check out faster."}
        </p>
        <CodeSignIn next={next} />
        <p className="mt-6 text-sm text-cocoa-700">
          New here? The same code creates your account. Orders you placed with this email appear
          straight away.
        </p>
      </div>
    );
  }

  const { profile, addresses, orders, favouriteIds } = await accountOverview(me.userId, me.email);
  const favourites = favouriteIds.length
    ? (await listCakeCards()).filter((c) => favouriteIds.includes(c.id))
    : [];
  const firstName = profile.name.split(" ")[0];

  return (
    <div className="grid gap-10">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-semibold">
            {firstName ? `Hello, ${firstName}!` : "Hello!"}
          </h1>
          <p className="mt-1 text-cocoa-700">{profile.email}</p>
        </div>
        <form action={signOutCustomer}>
          <button
            type="submit"
            className="rounded-[var(--radius-pill)] px-4 py-2 font-bold text-cocoa-700 ring-1 ring-cocoa-900/15 hover:bg-cream-200"
          >
            Sign out
          </button>
        </form>
      </header>

      {params.saved === "1" && (
        <p role="status" className="rounded-[var(--radius-md)] bg-pistachio-200 p-4 font-bold">
          🎉 Your details are saved. Next time, checkout fills itself in.
        </p>
      )}

      <section aria-labelledby="my-orders">
        <h2 id="my-orders" className="font-display text-2xl font-semibold">
          Your orders
        </h2>
        {orders.length === 0 ? (
          <p className="mt-2 text-cocoa-700">
            No orders yet.{" "}
            <Link href="/cakes" className="font-bold underline">
              Find your first cake
            </Link>
          </p>
        ) : (
          <ul className="mt-3 grid gap-3">
            {orders.map((order) => (
              <li
                key={order.id}
                className="rounded-[var(--radius-lg)] bg-white/70 p-4 shadow-[var(--shadow-soft)] ring-1 ring-cocoa-900/5"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-bold">
                      {order.number} · {formatCalendarDate(order.date)}
                    </p>
                    <p className="text-sm text-cocoa-700">
                      {order.items
                        .map((i) => `${i.quantity} × ${i.cakeName}, ${i.sizeLabel}`)
                        .join(" · ")}
                    </p>
                  </div>
                  <StatusChip status={order.status} />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="mr-auto font-bold">{formatMoney(order.total)}</span>
                  <Link
                    href={`/orders/${order.trackingToken}`}
                    aria-label={`Open order ${order.number}`}
                    className="rounded-[var(--radius-pill)] px-4 py-2 text-sm font-bold ring-1 ring-cocoa-900/15 hover:bg-cream-200"
                  >
                    Open
                  </Link>
                  <ReorderButton orderId={order.id} number={order.number} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="my-favourites">
        <h2 id="my-favourites" className="font-display text-2xl font-semibold">
          Favourite cakes
        </h2>
        {favourites.length === 0 ? (
          <p className="mt-2 text-cocoa-700">
            Tap the heart on any cake to keep it here.{" "}
            <Link href="/cakes" className="font-bold underline">
              Browse the cakes
            </Link>
          </p>
        ) : (
          <ul className="mt-3 grid gap-5 sm:grid-cols-2">
            {favourites.map((cake, i) => (
              <li key={cake.id}>
                <CakeCard cake={cake} index={i} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <AccountDetails
        name={profile.name}
        phone={profile.phone.replace(/^\+91/, "")}
        addresses={addresses}
      />
    </div>
  );
}
