import {
  ORDER_STATUS_COPY,
  orderJourney,
  type OrderFulfilment,
  type OrderStatus,
} from "@cozycakes/core";

const EMOJI: Record<OrderStatus, string> = {
  awaiting_payment: "📲",
  confirmed: "📒",
  baking: "🥣",
  ready: "🎂",
  out_for_delivery: "🛵",
  ready_for_pickup: "🏡",
  delivered: "🎉",
  collected: "🎉",
  cancelled: "✖️",
};

const time = new Intl.DateTimeFormat("en-IN", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});

/**
 * The order's journey (FR-018, US4): steps already reached show when, the current one glows, and
 * the rest wait in soft outline. A cancelled order stops at the last step it reached.
 */
export function OrderTimeline({
  status,
  fulfilment,
  timeline,
}: {
  status: OrderStatus;
  fulfilment: OrderFulfilment;
  timeline: Array<{ status: OrderStatus; at: Date | string }>;
}) {
  const reachedAt = new Map(timeline.map((t) => [t.status, new Date(t.at)]));
  // A UPI order paid by hand starts with its payment step.
  const journey: OrderStatus[] = reachedAt.has("awaiting_payment")
    ? ["awaiting_payment", ...orderJourney(fulfilment)]
    : orderJourney(fulfilment);
  const steps =
    status === "cancelled"
      ? [...journey.filter((s) => reachedAt.has(s)), "cancelled" as const]
      : journey;

  return (
    <ol aria-label="Order progress" className="relative grid gap-0">
      {steps.map((step, i) => {
        const at = reachedAt.get(step);
        const current = step === status;
        const done = Boolean(at) && !current;
        const last = i === steps.length - 1;
        return (
          <li
            key={step}
            aria-current={current ? "step" : undefined}
            className="relative flex gap-4 pb-5 last:pb-0"
          >
            {!last && (
              <span
                aria-hidden="true"
                className={`absolute left-5 top-10 h-[calc(100%-2.5rem)] w-0.5 -translate-x-1/2 ${
                  done ? "bg-pistachio-400" : "bg-cocoa-900/10"
                }`}
              />
            )}
            <span
              aria-hidden="true"
              className={`relative grid h-10 w-10 shrink-0 place-items-center rounded-full text-lg ${
                current
                  ? step === "cancelled"
                    ? "bg-cocoa-900/10"
                    : "bg-blush-100 ring-4 ring-blush-400/40"
                  : done
                    ? "bg-pistachio-200"
                    : "bg-cream-100 opacity-60 ring-1 ring-cocoa-900/10"
              }`}
            >
              {current && step !== "cancelled" && (
                <span className="absolute inset-0 animate-ping rounded-full bg-blush-400/30 motion-reduce:hidden" />
              )}
              {done ? "✓" : EMOJI[step]}
            </span>
            <span className={`min-w-0 pt-1.5 ${at || current ? "" : "text-cocoa-700"}`}>
              <span className={`block font-bold ${current ? "text-lg" : ""}`}>
                {ORDER_STATUS_COPY[step].label}
              </span>
              {current && <span className="block">{ORDER_STATUS_COPY[step].customer}</span>}
              {at && (
                <span className="block text-sm text-cocoa-700">
                  <time dateTime={at.toISOString()}>{time.format(at)}</time>
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
