import { z } from "zod";
import { CartQuoteRequestSchema, CartQuoteSchema } from "@cozycakes/core";
import { apiError, apiJson } from "@/lib/api";
import { quoteCartItems } from "@/lib/catalog";

export async function POST(request: Request) {
  const body = CartQuoteRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return apiError(400, "INVALID_CART", "Invalid cart", z.treeifyError(body.error));
  }
  return apiJson(CartQuoteSchema, await quoteCartItems(body.data.items));
}
