import { z } from "zod";
import { DiscountCheckRequestSchema, DiscountQuoteSchema } from "@cozycakes/core";
import { apiError, apiJson } from "@/lib/api";
import { checkoutErrorResponse } from "@/lib/checkout/http";
import { quoteDiscount } from "@/lib/checkout/service";

/** What a discount code takes off this cart. `400 DISCOUNT_INVALID` says why one doesn't work. */
export async function POST(request: Request) {
  const body = DiscountCheckRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return apiError(400, "INVALID_REQUEST", "Invalid request", z.treeifyError(body.error));
  }
  try {
    return apiJson(DiscountQuoteSchema, await quoteDiscount(body.data.code, body.data.items));
  } catch (error) {
    return checkoutErrorResponse(error);
  }
}
