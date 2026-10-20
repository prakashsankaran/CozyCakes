import { CheckoutCreatedSchema, CheckoutRequestSchema } from "@cozycakes/core";
import { apiError, apiJson } from "@/lib/api";
import { checkoutErrorResponse } from "@/lib/checkout/http";
import { startCheckout } from "@/lib/checkout/service";

/** Starts a checkout: re-prices, holds the date and registers the payment. */
export async function POST(request: Request) {
  const body = CheckoutRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return apiError(400, "INVALID_CHECKOUT", "Check your details", {
      issues: body.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }
  try {
    return apiJson(CheckoutCreatedSchema, await startCheckout(body.data), { status: 201 });
  } catch (error) {
    return checkoutErrorResponse(error);
  }
}
