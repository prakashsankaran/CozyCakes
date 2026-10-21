import { headers } from "next/headers";
import { formatMoney, type ForwardStatus } from "@cozycakes/core";
import { getDb, ordersRepository, type MovedOrder } from "@cozycakes/db";
import { sendOrderStatusEmail } from "@/lib/checkout/notify";
import { paymentProvider } from "@/lib/checkout/payments";
import { site } from "@/lib/site";

/**
 * Moving orders along (US4, FR-019, FR-023, FR-024): the back office calls these, and the
 * customer hears about the moves that matter to them.
 */

const repo = () => ordersRepository(getDb());

/** Base for links in emails sent from a Server Action. */
async function origin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return site.url;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : site.url;
}

export async function moveOrder(input: {
  orderId: string;
  to: ForwardStatus;
  actorUserId: string;
}): Promise<MovedOrder> {
  const moved = await repo().move(input);
  await sendOrderStatusEmail(moved, await origin());
  return moved;
}

/** `manual`: paid by UPI by hand, so the baker sends the money back from their UPI app. */
export type RefundOutcome = "refunded" | "not_paid_online" | "failed" | "manual";

/**
 * Cancels an order with the customer's reason and refunds an online payment in full. The order is
 * cancelled (and its date's place freed) even if the refund fails; the baker is then told to refund
 * it from the Razorpay dashboard. A UPI payment received by hand is refunded by hand too.
 */
export async function cancelOrder(input: {
  orderId: string;
  reason: string;
  actorUserId: string;
}): Promise<{ order: MovedOrder; refund: RefundOutcome }> {
  const order = await repo().move({
    orderId: input.orderId,
    to: "cancelled",
    actorUserId: input.actorUserId,
    note: input.reason,
  });

  let refund: RefundOutcome = "not_paid_online";
  const payment = await repo().capturedPayment(order.id);
  if (payment?.provider === "upi") {
    await repo().recordRefund({
      paymentId: payment.id,
      amount: payment.amount,
      providerRefundId: null,
      status: "manual",
      reason: input.reason,
    });
    refund = "manual";
  } else if (payment) {
    const provider = paymentProvider();
    try {
      if (!provider || provider.name !== payment.provider) {
        throw new Error(`No ${payment.provider} keys to refund ${payment.providerPaymentId}`);
      }
      const done = await provider.refund({
        paymentId: payment.providerPaymentId,
        amount: payment.amount,
        notes: { order: order.number, reason: input.reason.slice(0, 250) },
      });
      await repo().recordRefund({
        paymentId: payment.id,
        amount: payment.amount,
        providerRefundId: done.refundId,
        status: done.status,
        reason: input.reason,
      });
      refund = "refunded";
    } catch (error) {
      console.error(error);
      await repo().recordRefund({
        paymentId: payment.id,
        amount: payment.amount,
        providerRefundId: null,
        status: "failed",
        reason: input.reason,
      });
      refund = "failed";
    }
  }

  await sendOrderStatusEmail(order, await origin(), refund === "refunded");
  if (refund === "failed") {
    console.warn(`Refund of ${formatMoney(order.total)} for ${order.number} needs doing by hand`);
  }
  return { order, refund };
}
