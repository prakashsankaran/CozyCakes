import { z } from "zod";
import { CheckoutStatusSchema } from "@cozycakes/core";
import { apiError, apiJson } from "@/lib/api";
import { getCheckoutStatus } from "@/lib/checkout/service";

/** Poll after paying: `open`, `paid` (with order number and tracking token), `expired`, `failed`. */
export async function GET(_request: Request, ctx: RouteContext<"/api/v1/checkouts/[id]">) {
  const { id } = await ctx.params;
  const status = z.uuid().safeParse(id).success ? await getCheckoutStatus(id) : null;
  if (!status) return apiError(404, "CHECKOUT_NOT_FOUND", "We couldn't find that checkout");
  return apiJson(CheckoutStatusSchema, status);
}
