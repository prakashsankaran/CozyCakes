import { z } from "zod";
import { TagSchema } from "@cozycakes/core";
import { apiJson } from "@/lib/api";
import { listTags } from "@/lib/catalog";

export async function GET() {
  return apiJson(z.object({ tags: z.array(TagSchema) }), { tags: await listTags() });
}
