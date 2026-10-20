import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { adminRepository, getDb } from "@cozycakes/db";
import { MenuList } from "@/components/admin/menu-list";
import { LoadingCards, PageTitle, buttonClass } from "@/components/admin/ui";
import { requireOwner } from "@/lib/admin/dal";

export const metadata: Metadata = { title: "Menu" };

export default function MenuPage() {
  return (
    <>
      <PageTitle
        action={
          <Link href="/admin/menu/new" className={buttonClass.primary}>
            Add a cake
          </Link>
        }
      >
        Menu
      </PageTitle>
      <p className="mt-2 text-cocoa-700">
        Cakes show in the shop in this order. Hidden drafts and archived cakes stay out of sight.
      </p>
      <Suspense fallback={<LoadingCards />}>
        <Cakes />
      </Suspense>
    </>
  );
}

async function Cakes() {
  await requireOwner();
  return <MenuList cakes={await adminRepository(getDb()).listCakes()} />;
}
