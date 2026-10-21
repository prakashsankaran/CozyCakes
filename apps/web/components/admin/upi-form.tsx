"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { UpiSettingsInput } from "@cozycakes/core";
import { saveUpi } from "@/app/(admin)/admin/actions";
import { Card, buttonClass, inputClass } from "./ui";

/**
 * Getting paid by UPI, by hand (research.md §6): with a UPI ID set, checkout opens and customers
 * pay into it from the order page. No gateway, so no fees and no KYC.
 */
export function UpiForm({ settings, gateway }: { settings: UpiSettingsInput; gateway: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState(settings);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <Card>
      <form
        aria-label="Getting paid by UPI"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const result = await saveUpi(form);
            if (result.ok) router.refresh();
            setMessage(
              result.ok
                ? {
                    ok: true,
                    text: form.upiId.trim()
                      ? "Saved. Customers can now order and pay you by UPI."
                      : "Saved. UPI checkout is off.",
                  }
                : { ok: false, text: result.errors[0]! },
            );
          });
        }}
      >
        <h2 className="font-display text-2xl font-semibold">Getting paid by UPI</h2>
        <p className="mt-2 text-cocoa-700">
          {gateway
            ? "Card payments are on, so checkout uses those. This UPI ID is kept for later."
            : "Customers see this UPI ID and a QR code after ordering. Tap “Payment received” on the order once the money reaches you."}
        </p>
        <label htmlFor="upi-id" className="mt-3 block font-bold">
          UPI ID
        </label>
        <input
          id="upi-id"
          inputMode="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="name@okbank"
          maxLength={100}
          value={form.upiId}
          onChange={(e) => setForm({ ...form, upiId: e.target.value })}
          className={inputClass}
        />
        <label htmlFor="upi-name" className="mt-3 block font-bold">
          Name shown in their UPI app
        </label>
        <input
          id="upi-name"
          maxLength={60}
          placeholder="CozyCakes"
          value={form.upiName}
          onChange={(e) => setForm({ ...form, upiName: e.target.value })}
          className={inputClass}
        />
        <button type="submit" disabled={pending} className={`${buttonClass.primary} mt-4`}>
          {pending ? "Saving…" : "Save"}
        </button>
        {message && (
          <p
            role={message.ok ? "status" : "alert"}
            className={`mt-2 font-bold ${message.ok ? "text-pistachio-700" : "text-blush-700"}`}
          >
            {message.text}
          </p>
        )}
      </form>
    </Card>
  );
}
