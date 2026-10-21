import { z } from "zod";
import { CheckoutStatusSchema, PaymentResultSchema } from "@cozycakes/core";
import { apiError, apiJson } from "@/lib/api";
import { checkoutErrorResponse, siteOrigin } from "@/lib/checkout/http";
import { completePayment } from "@/lib/checkout/service";

/** The browser hands over the provider's signed payment result; a verified one confirms the order. */
export async function POST(request: Request, ctx: RouteContext<"/api/v1/checkouts/[id]/payment">) {
  const { id } = await ctx.params;
  const body = PaymentResultSchema.safeParse(await request.json().catch(() => null));
  if (!z.uuid().safeParse(id).success || !body.success) {
    return apiError(400, "INVALID_PAYMENT", "Invalid payment result");
  }
  try {
    return apiJson(CheckoutStatusSchema, await completePayment(id, body.data, siteOrigin(request)));
  } catch (error) {
    return checkoutErrorResponse(error);
  }
}
