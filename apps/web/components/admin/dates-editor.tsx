"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  formatCalendarDate,
  formatMoney,
  rupeesToPaise,
  type BakerySettingsInput,
  type DayAvailabilityInput,
  type DeliveryZoneInput,
} from "@cozycakes/core";
import { clearDay, deleteZone, saveDay, saveSettings, saveZone } from "@/app/(admin)/admin/actions";
import { Card, buttonClass, inputClass } from "./ui";

/** Capacity, days off, pickup details and delivery area (FR-012, FR-022, tasks T055). */
export function DatesEditor({
  settings,
  days,
  zones,
  today,
}: {
  settings: BakerySettingsInput;
  days: DayAvailabilityInput[];
  zones: DeliveryZoneInput[];
  today: string;
}) {
  return (
    <div className="mt-6 grid gap-5 md:grid-cols-2">
      <SettingsForm settings={settings} />
      <DaysForm days={days} today={today} defaultCapacity={settings.defaultDailyCapacity} />
      <ZonesForm zones={zones} />
    </div>
  );
}

function Status({ message }: { message: { ok: boolean; text: string } | null }) {
  if (!message) return null;
  return (
    <p
      role={message.ok ? "status" : "alert"}
      className={`mt-2 font-bold ${message.ok ? "text-pistachio-700" : "text-blush-700"}`}
    >
      {message.text}
    </p>
  );
}

function SettingsForm({ settings }: { settings: BakerySettingsInput }) {
  const [form, setForm] = useState(settings);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <Card>
      <form
        aria-label="Baking capacity and pickup"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const result = await saveSettings(form);
            setMessage(
              result.ok ? { ok: true, text: "Saved" } : { ok: false, text: result.errors[0]! },
            );
          });
        }}
      >
        <h2 className="font-display text-xl font-semibold">Every day</h2>
        <label htmlFor="capacity" className="mt-3 block font-bold">
          Cakes you can bake a day
        </label>
        <input
          id="capacity"
          type="number"
          min={1}
          max={50}
          required
          value={form.defaultDailyCapacity}
          onChange={(e) => setForm({ ...form, defaultDailyCapacity: Number(e.target.value) })}
          className={`${inputClass} w-28`}
        />
        <label htmlFor="window" className="mt-3 block font-bold">
          Take orders up to how many days ahead?
        </label>
        <input
          id="window"
          type="number"
          min={7}
          max={180}
          required
          value={form.bookingWindowDays}
          onChange={(e) => setForm({ ...form, bookingWindowDays: Number(e.target.value) })}
          className={`${inputClass} w-28`}
        />
        <label htmlFor="pickup" className="mt-3 block font-bold">
          Pickup address
        </label>
        <textarea
          id="pickup"
          rows={2}
          maxLength={300}
          value={form.pickupAddress}
          onChange={(e) => setForm({ ...form, pickupAddress: e.target.value })}
          className={inputClass}
        />
        <label htmlFor="pickup-notes" className="mt-3 block font-bold">
          Pickup instructions
        </label>
        <textarea
          id="pickup-notes"
          rows={2}
          maxLength={300}
          value={form.pickupInstructions}
          onChange={(e) => setForm({ ...form, pickupInstructions: e.target.value })}
          placeholder="Ring the bell at the side gate"
          className={inputClass}
        />
        <button type="submit" disabled={pending} className={`${buttonClass.primary} mt-4`}>
          {pending ? "Saving…" : "Save"}
        </button>
        <Status message={message} />
      </form>
    </Card>
  );
}

function DaysForm({
  days,
  today,
  defaultCapacity,
}: {
  days: DayAvailabilityInput[];
  today: string;
  defaultCapacity: number;
}) {
  const router = useRouter();
  const [date, setDate] = useState("");
  const [closed, setClosed] = useState(true);
  const [capacity, setCapacity] = useState(String(defaultCapacity));
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  return (
    <Card>
      <h2 className="font-display text-xl font-semibold">Special days</h2>
      <form
        aria-label="Add a special day"
        className="mt-3"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const result = await saveDay({
              date,
              blocked: closed,
              capacityOverride: closed ? null : Number(capacity),
              note,
            });
            if (result.ok) {
              setMessage({ ok: true, text: `Saved ${formatCalendarDate(date)}` });
              setDate("");
              setNote("");
              router.refresh();
            } else setMessage({ ok: false, text: result.errors[0]! });
          });
        }}
      >
        <label htmlFor="day" className="font-bold">
          Date
        </label>
        <input
          id="day"
          type="date"
          min={today}
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={`${inputClass} w-48`}
        />
        <fieldset className="mt-3">
          <legend className="font-bold">That day</legend>
          <label className="mt-1 flex items-center gap-2">
            <input
              type="radio"
              name="day-kind"
              checked={closed}
              onChange={() => setClosed(true)}
              className="h-5 w-5 accent-[var(--color-blush-700)]"
            />
            Closed, no orders
          </label>
          <label className="mt-1 flex flex-wrap items-center gap-2">
            <input
              type="radio"
              name="day-kind"
              checked={!closed}
              onChange={() => setClosed(false)}
              className="h-5 w-5 accent-[var(--color-blush-700)]"
            />
            Bake a different number:
            <input
              type="number"
              aria-label="Cakes that day"
              min={0}
              max={50}
              disabled={closed}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              className={`${inputClass} mt-0 w-20`}
            />
          </label>
        </fieldset>
        <label htmlFor="note" className="mt-3 block font-bold">
          Note <span className="font-normal text-cocoa-700">(just for you)</span>
        </label>
        <input
          id="note"
          maxLength={120}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Family wedding"
          className={inputClass}
        />
        <button type="submit" disabled={pending} className={`${buttonClass.primary} mt-4`}>
          Save day
        </button>
        <Status message={message} />
      </form>

      <h3 className="mt-6 font-bold">Coming up</h3>
      {days.length === 0 ? (
        <p className="mt-1 text-cocoa-700">
          No special days. Every day takes up to {defaultCapacity} cakes.
        </p>
      ) : (
        <ul className="mt-2 grid gap-2">
          {days.map((d) => (
            <li
              key={d.date}
              className="flex items-center justify-between gap-2 rounded-[var(--radius-md)] bg-cream-100 px-3 py-2"
            >
              <span>
                <span className="font-bold">{formatCalendarDate(d.date)}</span>{" "}
                <span className="text-cocoa-700">
                  {d.blocked ? "Closed" : `${d.capacityOverride} cakes`}
                  {d.note ? ` · ${d.note}` : ""}
                </span>
              </span>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    await clearDay(d.date);
                    router.refresh();
                  })
                }
                className={buttonClass.quiet}
              >
                Remove<span className="sr-only"> {formatCalendarDate(d.date)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** PIN codes the baker delivers to, each with its fee (FR-012, research.md §11). */
function ZonesForm({ zones }: { zones: DeliveryZoneInput[] }) {
  const router = useRouter();
  const [postalCode, setPostalCode] = useState("");
  const [fee, setFee] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  return (
    <Card>
      <h2 className="font-display text-xl font-semibold">Delivery area</h2>
      <p className="mt-1 text-sm text-cocoa-700">
        Customers can choose delivery only to these PIN codes. Pickup is always offered.
      </p>
      <form
        aria-label="Add a delivery PIN code"
        className="mt-3 flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          const paise = rupeesToPaise(fee || "0");
          if (paise === null) {
            setMessage({ ok: false, text: "Enter the fee in rupees" });
            return;
          }
          start(async () => {
            const result = await saveZone({ postalCode, fee: paise, active: true });
            if (result.ok) {
              setMessage({ ok: true, text: `Delivering to ${postalCode}` });
              setPostalCode("");
              setFee("");
              router.refresh();
            } else setMessage({ ok: false, text: result.errors[0]! });
          });
        }}
      >
        <div>
          <label htmlFor="zone-pin" className="font-bold">
            PIN code
          </label>
          <input
            id="zone-pin"
            inputMode="numeric"
            maxLength={6}
            required
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, ""))}
            className={`${inputClass} w-32 tracking-widest`}
          />
        </div>
        <div>
          <label htmlFor="zone-fee" className="font-bold">
            Fee (₹)
          </label>
          <input
            id="zone-fee"
            inputMode="decimal"
            value={fee}
            onChange={(e) => setFee(e.target.value)}
            placeholder="0"
            className={`${inputClass} w-24`}
          />
        </div>
        <button type="submit" disabled={pending} className={buttonClass.primary}>
          Add
        </button>
      </form>
      <Status message={message} />
      {zones.length === 0 ? (
        <p className="mt-4 text-cocoa-700">No delivery yet: customers will pick their cakes up.</p>
      ) : (
        <ul className="mt-4 flex flex-wrap gap-2">
          {zones.map((z) => (
            <li
              key={z.postalCode}
              className="flex items-center gap-1 rounded-[var(--radius-pill)] bg-cream-100 py-1 pl-3"
            >
              <span className="font-bold tracking-wider">{z.postalCode}</span>
              <span className="text-sm text-cocoa-700">{z.fee ? formatMoney(z.fee) : "free"}</span>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    await deleteZone(z.postalCode);
                    router.refresh();
                  })
                }
                className={buttonClass.quiet}
              >
                Remove<span className="sr-only"> {z.postalCode}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
