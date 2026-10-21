import type { Metadata } from "next";
import { Suspense } from "react";
import { todayIn } from "@cozycakes/core";
import { adminRepository, discountsRepository, getDb } from "@cozycakes/db";
import { DiscountsEditor } from "@/components/admin/discounts-editor";
import { LoadingCards, PageTitle } from "@/components/admin/ui";
import { requireOwner } from "@/lib/admin/dal";

export const metadata: Metadata = { title: "Discounts" };

export default function DiscountsPage() {
  return (
    <>
      <PageTitle>Discount codes</PageTitle>
      <p className="mt-2 text-cocoa-700">
        Codes customers type at checkout. Share them on Instagram for festivals, birthdays or
        regulars.
      </p>
      <Suspense fallback={<LoadingCards />}>
        <Content />
      </Suspense>
    </>
  );
}

async function Content() {
  await requireOwner();
  const [codes, settings] = await Promise.all([
    discountsRepository(getDb()).list(),
    adminRepository(getDb()).getSettings(),
  ]);
  return <DiscountsEditor codes={codes} today={todayIn(settings.timeZone)} />;
}
