import { UpiPaidClaimSchema } from "@cozycakes/core";
import { apiError } from "@/lib/api";
import { checkoutErrorResponse } from "@/lib/checkout/http";
import { claimUpiPayment } from "@/lib/checkout/service";

/**
 * The customer says they've paid a UPI order (research.md §6). It only tells the baker to check
 * their UPI app; the order is confirmed when the baker taps "Payment received".
 */
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/v1/orders/track/[token]/paid">,
) {
  const { token } = await ctx.params;
  const body = UpiPaidClaimSchema.safeParse(await request.json().catch(() => ({})));
  if (!/^[\w-]{20,64}$/.test(token)) {
    return apiError(404, "ORDER_NOT_FOUND", "We couldn't find that order");
  }
  if (!body.success) {
    return apiError(400, "INVALID_REFERENCE", body.error.issues[0]!.message);
  }
  try {
    await claimUpiPayment(token, body.data.reference);
    return new Response(null, { status: 204 });
  } catch (error) {
    return checkoutErrorResponse(error);
  }
}
