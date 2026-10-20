import { z } from "zod";
import { paymentSignature, PaymentResultSchema } from "@cozycakes/core";
import { apiError, apiJson } from "@/lib/api";
import { TEST_PAYMENT_SECRET, testPaymentsEnabled } from "@/lib/checkout/payments";
import { getCheckoutStatus } from "@/lib/checkout/service";
import { getDb, checkoutRepository } from "@cozycakes/db";

const Body = z.object({ outcome: z.enum(["success", "failure"]) });

/**
 * Automated tests only (`PAYMENT_PROVIDER=test`): plays the payment provider's checkout and returns
 * a signed result, which the browser then submits like a real one. 404 everywhere else.
 */
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/v1/checkouts/[id]/test-payment">,
) {
  const { id } = await ctx.params;
  if (!testPaymentsEnabled() || !z.uuid().safeParse(id).success || !(await getCheckoutStatus(id))) {
    return apiError(404, "NOT_FOUND", "Not found");
  }
  const body = Body.safeParse(await request.json().catch(() => null));
  if (!body.success) return apiError(400, "INVALID_OUTCOME", "Invalid outcome");
  if (body.data.outcome === "failure") {
    return apiError(402, "PAYMENT_FAILED", "Your bank declined the payment");
  }
  const checkout = await checkoutRepository(getDb()).checkout(id);
  const providerOrderId = checkout!.paymentProviderOrderId!;
  const providerPaymentId = `test_pay_${crypto.randomUUID().slice(0, 8)}`;
  return apiJson(PaymentResultSchema, {
    providerOrderId,
    providerPaymentId,
    signature: await paymentSignature(TEST_PAYMENT_SECRET, providerOrderId, providerPaymentId),
  });
}
