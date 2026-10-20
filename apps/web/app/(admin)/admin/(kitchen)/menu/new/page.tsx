import type { Metadata } from "next";
import { Suspense } from "react";
import { adminRepository, getDb } from "@cozycakes/db";
import { CakeEditor } from "@/components/admin/cake-editor";
import { LoadingCards, PageTitle } from "@/components/admin/ui";
import { requireOwner } from "@/lib/admin/dal";
import { uploadsEnabled } from "@/lib/uploads";

export const metadata: Metadata = { title: "Add a cake" };

export default function NewCakePage() {
  return (
    <>
      <PageTitle>Add a cake</PageTitle>
      <Suspense fallback={<LoadingCards />}>
        <Editor />
      </Suspense>
    </>
  );
}

async function Editor() {
  await requireOwner();
  const repo = adminRepository(getDb());
  const [tags, groups] = await Promise.all([repo.listTags(), repo.listOptionGroups()]);
  return <CakeEditor cake={null} tags={tags} groups={groups} uploadsEnabled={uploadsEnabled()} />;
}
