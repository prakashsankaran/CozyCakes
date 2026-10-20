import type { Metadata } from "next";
import { Suspense } from "react";
import { adminRepository, getDb } from "@cozycakes/db";
import { ChoicesEditor } from "@/components/admin/choices-editor";
import { LoadingCards, PageTitle } from "@/components/admin/ui";
import { requireOwner } from "@/lib/admin/dal";

export const metadata: Metadata = { title: "Choices" };

export default function ChoicesPage() {
  return (
    <>
      <PageTitle>Choices</PageTitle>
      <p className="mt-2 text-cocoa-700">
        Flavours, frostings, dietary options and add-ons that customers pick in the cake builder.
        Each cake chooses which of these groups it offers.
      </p>
      <Suspense fallback={<LoadingCards />}>
        <Groups />
      </Suspense>
    </>
  );
}

async function Groups() {
  await requireOwner();
  return <ChoicesEditor groups={await adminRepository(getDb()).listOptionGroups()} />;
}
