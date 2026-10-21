import Link from "next/link";
import { Suspense } from "react";
import { formatCalendarDate, todayIn } from "@cozycakes/core";
import { adminRepository, getDb, ordersRepository } from "@cozycakes/db";
import { Card, LoadingCards, PageTitle, buttonClass } from "@/components/admin/ui";
import { UpiForm } from "@/components/admin/upi-form";
import { requireOwner } from "@/lib/admin/dal";
import { emailConfigured } from "@/lib/email";
import { checkoutMethod } from "@/lib/checkout/payments";
import { releaseUnpaidOrders } from "@/lib/checkout/service";
import { uploadsEnabled } from "@/lib/uploads";

export default function KitchenHome() {
  return (
    <>
      <PageTitle>Hello, baker</PageTitle>
      <Suspense fallback={<LoadingCards />}>
        <Overview />
      </Suspense>
    </>
  );
}

async function Overview() {
  await requireOwner();
  const repo = adminRepository(getDb());
  await releaseUnpaidOrders();
  const [cakes, settings, upi, method] = await Promise.all([
    repo.listCakes(),
    repo.getSettings(),
    repo.getUpi(),
    checkoutMethod(),
  ]);
  const today = todayIn(settings.timeZone);
  const [days, upcoming] = await Promise.all([
    repo.listDays(today),
    ordersRepository(getDb()).upcoming(today),
  ]);
  const open = upcoming.filter((o) => o.status !== "cancelled");
  const todays = open.filter((o) => o.date === today).length;
  const toStart = open.filter((o) => o.status === "confirmed").length;
  const unpaid = open.filter((o) => o.status === "awaiting_payment").length;
  const onMenu = cakes.filter((c) => c.status === "visible").length;
  const paused = cakes.filter((c) => c.status === "paused").length;
  const drafts = cakes.filter((c) => c.status === "draft").length;
  const blocked = days.filter((d) => d.blocked);

  const setup = [
    { label: "Sign-in emails", done: emailConfigured(), hint: "RESEND_API_KEY" },
    { label: "Cake photo uploads", done: uploadsEnabled(), hint: "CLOUDINARY_URL" },
    {
      label: method === "upi" ? "Payments by UPI" : "Online payments",
      done: method !== null,
      hint: "add your UPI ID below",
    },
  ];

  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2">
      <Card>
        <h2 className="font-display text-2xl font-semibold">Menu</h2>
        <p className="mt-2 text-cocoa-700">
          {onMenu} on the menu · {paused} back soon · {drafts} hidden drafts
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/admin/menu/new" className={buttonClass.primary}>
            Add a cake
          </Link>
          <Link href="/admin/menu" className={buttonClass.soft}>
            Edit the menu
          </Link>
        </div>
      </Card>

      <Card>
        <h2 className="font-display text-2xl font-semibold">Dates</h2>
        <p className="mt-2 text-cocoa-700">
          Up to {settings.defaultDailyCapacity} cakes a day.{" "}
          {blocked.length
            ? `Closed on ${blocked
                .slice(0, 3)
                .map((d) => formatCalendarDate(d.date))
                .join(", ")}${blocked.length > 3 ? " and more" : ""}.`
            : "No days off coming up."}
        </p>
        <Link href="/admin/dates" className={`${buttonClass.soft} mt-4`}>
          Block a day or change capacity
        </Link>
      </Card>

      <Card>
        <h2 className="font-display text-2xl font-semibold">Orders</h2>
        <p className="mt-2 text-cocoa-700">
          {open.length
            ? `${todays} for today · ${toStart} not started yet${unpaid ? ` · ${unpaid} awaiting payment` : ""} · ${open.length} coming up`
            : method
              ? "No orders coming up yet. New orders appear here and in your inbox."
              : "Customers send their cart to you on Instagram until online payments are switched on."}
        </p>
        <Link href="/admin/orders" className={`${buttonClass.soft} mt-4`}>
          Open the orders board
        </Link>
      </Card>

      <Card>
        <h2 className="font-display text-2xl font-semibold">Set-up</h2>
        <ul className="mt-3 space-y-2">
          {setup.map((s) => (
            <li key={s.label} className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-sm font-bold ${
                  s.done ? "bg-pistachio-400 text-cocoa-900" : "bg-cream-200 text-cocoa-700"
                }`}
              >
                {s.done ? "✓" : "·"}
              </span>
              <span>
                <span className="font-bold">{s.label}</span>{" "}
                <span className="text-sm text-cocoa-700">
                  {s.done ? "ready" : `not yet (${s.hint})`}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <UpiForm settings={upi} gateway={method === "razorpay"} />
    </div>
  );
}
