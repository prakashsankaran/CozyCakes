import { z } from "zod";
import { ReorderSchema } from "@cozycakes/core";
import { apiError, apiJson } from "@/lib/api";
import { reorder } from "@/lib/account/service";
import { customerFromRequest } from "@/lib/account/session";

/** Today's cart lines for one of the customer's past orders. */
export async function POST(request: Request, ctx: RouteContext<"/api/v1/me/orders/[id]/reorder">) {
  const me = await customerFromRequest(request);
  if (!me) return apiError(401, "SIGNED_OUT", "Sign in to order again");
  const { id } = await ctx.params;
  const result = z.uuid().safeParse(id).success ? await reorder(me.userId, id) : null;
  if (!result) return apiError(404, "ORDER_NOT_FOUND", "We couldn't find that order");
  return apiJson(ReorderSchema, result);
}
