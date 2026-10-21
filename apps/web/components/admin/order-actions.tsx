"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ORDER_CANCEL_REASON_MAX, type ForwardStatus } from "@cozycakes/core";
import { advanceOrder, cancelOrder } from "@/app/(admin)/admin/actions";
import { buttonClass, inputClass } from "./ui";

/**
 * The big "next step" button and the cancel flow for one order. Cancelling asks for a reason in
 * the page (no browser dialogs), since the customer reads it and gets their money back.
 */
export function OrderActions({
  orderId,
  next,
  canCancel,
  paidOnline,
  total,
}: {
  orderId: string;
  next: { status: ForwardStatus; label: string } | null;
  canCancel: boolean;
  paidOnline: boolean;
  total: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");

  return (
    <div className="mt-5 grid gap-3">
      <div className="flex flex-wrap gap-2">
        {next && (
          <button
            type="button"
            disabled={pending}
            className={`${buttonClass.primary} text-lg`}
            onClick={() =>
              start(async () => {
                setError(null);
                const result = await advanceOrder({ orderId, to: next.status });
                if (result.ok) router.refresh();
                else setError(result.errors[0]!);
              })
            }
          >
            {next.label}
          </button>
        )}
        {canCancel && !cancelling && (
          <button type="button" className={buttonClass.quiet} onClick={() => setCancelling(true)}>
            Cancel order…
          </button>
        )}
      </div>

      {cancelling && (
        <form
          aria-label="Cancel this order"
          className="rounded-[var(--radius-lg)] bg-blush-100 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              setError(null);
              const result = await cancelOrder({ orderId, reason });
              if (result.ok) {
                setCancelling(false);
                router.refresh();
              } else setError(result.errors[0]!);
            });
          }}
        >
          <label htmlFor="cancel-reason" className="font-bold">
            Why are you cancelling?
          </label>
          <p className="text-sm text-cocoa-700">
            The customer sees this.{" "}
            {paidOnline ? `They get their ${total} back in full.` : "They didn't pay online."}
          </p>
          <textarea
            id="cancel-reason"
            required
            rows={2}
            maxLength={ORDER_CANCEL_REASON_MAX}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={inputClass}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="submit" disabled={pending} className={buttonClass.primary}>
              {paidOnline ? "Cancel and refund" : "Cancel order"}
            </button>
            <button
              type="button"
              className={buttonClass.quiet}
              onClick={() => setCancelling(false)}
            >
              Keep the order
            </button>
          </div>
        </form>
      )}

      {error && (
        <p role="alert" className="font-bold text-blush-700">
          {error}
        </p>
      )}
    </div>
  );
}
