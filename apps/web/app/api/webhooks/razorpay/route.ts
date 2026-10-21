import { apiError } from "@/lib/api";
import { checkoutErrorResponse, siteOrigin } from "@/lib/checkout/http";
import { handlePaymentWebhook } from "@/lib/checkout/service";

/** Razorpay webhook (contracts: POST /api/webhooks/razorpay); set its secret as RAZORPAY_WEBHOOK_SECRET. */
export async function POST(request: Request) {
  const signature = request.headers.get("x-razorpay-signature");
  if (!signature) return apiError(400, "INVALID_SIGNATURE", "Missing signature");
  try {
    await handlePaymentWebhook(await request.text(), signature, siteOrigin(request));
    return Response.json({ ok: true });
  } catch (error) {
    return checkoutErrorResponse(error);
  }
}
