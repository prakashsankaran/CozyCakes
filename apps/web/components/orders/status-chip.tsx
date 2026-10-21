import { ORDER_STATUS_COPY, type OrderStatus } from "@cozycakes/core";

const tone: Record<OrderStatus, string> = {
  awaiting_payment: "bg-cream-100 text-cocoa-900 ring-1 ring-caramel-400",
  confirmed: "bg-blush-100 text-cocoa-900",
  baking: "bg-caramel-200 text-cocoa-900",
  ready: "bg-pistachio-200 text-cocoa-900",
  out_for_delivery: "bg-pistachio-400 text-cocoa-900",
  ready_for_pickup: "bg-pistachio-400 text-cocoa-900",
  delivered: "bg-cream-200 text-cocoa-700",
  collected: "bg-cream-200 text-cocoa-700",
  cancelled: "bg-cocoa-900/10 text-cocoa-700",
};

/** An order's status as a coloured pill, the same in the shop and the kitchen. */
export function StatusChip({
  status,
  className = "",
}: {
  status: OrderStatus;
  className?: string;
}) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-[var(--radius-pill)] px-3 py-1 text-sm font-bold ${tone[status]} ${className}`}
    >
      {ORDER_STATUS_COPY[status].label}
    </span>
  );
}
