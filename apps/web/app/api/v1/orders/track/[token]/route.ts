import { TrackedOrderSchema } from "@cozycakes/core";
import { apiError, apiJson } from "@/lib/api";
import { getOrderByTrackingToken } from "@/lib/checkout/service";

/** The private order link as data (FR-018): no login, the token is the secret. */
export async function GET(_request: Request, ctx: RouteContext<"/api/v1/orders/track/[token]">) {
  const { token } = await ctx.params;
  const found = /^[\w-]{20,64}$/.test(token) ? await getOrderByTrackingToken(token) : null;
  if (!found) return apiError(404, "ORDER_NOT_FOUND", "We couldn't find that order");
  const { order, pickup, upi } = found;
  return apiJson(TrackedOrderSchema, {
    number: order.number,
    status: order.status,
    fulfilment: order.fulfilment,
    date: order.date,
    slotLabel: order.slotLabel,
    contactName: order.contactName,
    address: order.address,
    pickup: order.fulfilment === "pickup" ? pickup : null,
    cancelReason: order.cancelReason,
    items: order.items,
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    discount: order.discount,
    total: order.total,
    timeline: order.timeline.map((t) => ({ status: t.status, at: t.at.toISOString() })),
    upi: upi && { ...upi, payBy: upi.payBy.toISOString() },
  });
}
