import type { Metadata } from "next";
import { Suspense } from "react";
import { todayIn } from "@cozycakes/core";
import { adminRepository, getDb } from "@cozycakes/db";
import { DatesEditor } from "@/components/admin/dates-editor";
import { LoadingCards, PageTitle } from "@/components/admin/ui";
import { requireOwner } from "@/lib/admin/dal";

export const metadata: Metadata = { title: "Dates" };

export default function DatesPage() {
  return (
    <>
      <PageTitle>Dates and capacity</PageTitle>
      <p className="mt-2 text-cocoa-700">
        How many cakes you can bake a day, days off, pickup details, times and where you deliver.
        Checkout uses these to decide which dates, times and addresses customers can choose.
      </p>
      <Suspense fallback={<LoadingCards />}>
        <Content />
      </Suspense>
    </>
  );
}

async function Content() {
  await requireOwner();
  const repo = adminRepository(getDb());
  const settings = await repo.getSettings();
  const today = todayIn(settings.timeZone);
  const [days, zones, slots] = await Promise.all([
    repo.listDays(today),
    repo.listZones(),
    repo.listSlots(),
  ]);
  return <DatesEditor settings={settings} days={days} zones={zones} slots={slots} today={today} />;
}
