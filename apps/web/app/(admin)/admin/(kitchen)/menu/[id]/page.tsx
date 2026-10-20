import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { adminRepository, getDb } from "@cozycakes/db";
import { CakeEditor } from "@/components/admin/cake-editor";
import { LoadingCards, PageTitle, buttonClass } from "@/components/admin/ui";
import { requireOwner } from "@/lib/admin/dal";
import { uploadsEnabled } from "@/lib/uploads";

export const metadata: Metadata = { title: "Edit cake" };

export default function EditCakePage({ params }: PageProps<"/admin/menu/[id]">) {
  return (
    <Suspense
      fallback={
        <>
          <PageTitle>Edit cake</PageTitle>
          <LoadingCards />
        </>
      }
    >
      <Editor params={params} />
    </Suspense>
  );
}

async function Editor({ params }: { params: PageProps<"/admin/menu/[id]">["params"] }) {
  await requireOwner();
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();
  const repo = adminRepository(getDb());
  const [cake, tags, groups] = await Promise.all([
    repo.getCake(id.data),
    repo.listTags(),
    repo.listOptionGroups(),
  ]);
  if (!cake) notFound();
  return (
    <>
      <PageTitle
        action={
          cake.status === "visible" || cake.status === "paused" ? (
            <Link href={`/cakes/${cake.slug}`} className={buttonClass.soft}>
              See it in the shop
            </Link>
          ) : undefined
        }
      >
        {cake.name}
      </PageTitle>
      <CakeEditor cake={cake} tags={tags} groups={groups} uploadsEnabled={uploadsEnabled()} />
    </>
  );
}
