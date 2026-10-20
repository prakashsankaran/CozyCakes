import { CakeDetailSchema } from "@cozycakes/core";
import { apiError, apiJson } from "@/lib/api";
import { getCakeDetail } from "@/lib/catalog";

export async function GET(_request: Request, ctx: RouteContext<"/api/v1/cakes/[slug]">) {
  const { slug } = await ctx.params;
  const cake = await getCakeDetail(slug);
  if (!cake) return apiError(404, "CAKE_NOT_FOUND", "No cake with that name");
  return apiJson(CakeDetailSchema, cake);
}
