import { z } from "zod";
import { CakeCardSchema, CakeFilterQuerySchema } from "@cozycakes/core";
import { apiError, apiJson, searchParamsObject } from "@/lib/api";
import { listCakeCards } from "@/lib/catalog";

export async function GET(request: Request) {
  const query = CakeFilterQuerySchema.safeParse(searchParamsObject(request.url));
  if (!query.success) {
    return apiError(400, "INVALID_QUERY", "Invalid filter", z.treeifyError(query.error));
  }
  return apiJson(z.object({ cakes: z.array(CakeCardSchema) }), {
    cakes: await listCakeCards(query.data),
  });
}
