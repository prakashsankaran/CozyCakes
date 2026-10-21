"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  checkDiscount,
  describeDiscount,
  formatCalendarDate,
  formatMoney,
  rupeesToPaise,
  type DiscountType,
} from "@cozycakes/core";
import type { StoredDiscount } from "@cozycakes/db";
import { saveDiscount, setDiscountActive } from "@/app/(admin)/admin/actions";
import { Card, buttonClass, inputClass } from "./ui";

type Draft = {
  code: string;
  type: DiscountType;
  amount: string;
  minOrder: string;
  startsOn: string;
  endsOn: string;
  maxUses: string;
  active: boolean;
};

const EMPTY: Draft = {
  code: "",
  type: "percent",
  amount: "",
  minOrder: "",
  startsOn: "",
  endsOn: "",
  maxUses: "",
  active: true,
};

const toDraft = (c: StoredDiscount): Draft => ({
  code: c.code,
  type: c.type,
  amount: c.type === "percent" ? String(c.value) : String(c.value / 100),
  minOrder: c.minSubtotal ? String(c.minSubtotal / 100) : "",
  startsOn: c.startsOn ?? "",
  endsOn: c.endsOn ?? "",
  maxUses: c.maxRedemptions ? String(c.maxRedemptions) : "",
  active: c.active,
});

/** Where a code stands today, in a word, using the same rules as checkout. */
function standing(code: StoredDiscount, today: string) {
  const result = checkDiscount(code, { subtotal: Number.MAX_SAFE_INTEGER, today });
  if (result.ok) return { label: "Working", tone: "bg-pistachio-200" };
  const labels = {
    unknown: "Unknown",
    paused: "Paused",
    not_started: "Not started",
    expired: "Ended",
    used_up: "Used up",
    min_subtotal: "Working",
  } as const;
  return { label: labels[result.reason], tone: "bg-cream-200 text-cocoa-700" };
}

function conditions(c: StoredDiscount) {
  const parts = [];
  if (c.minSubtotal) parts.push(`on orders of ${formatMoney(c.minSubtotal)}+`);
  if (c.startsOn && c.endsOn) {
    parts.push(`${formatCalendarDate(c.startsOn)} to ${formatCalendarDate(c.endsOn)}`);
  } else if (c.startsOn) parts.push(`from ${formatCalendarDate(c.startsOn)}`);
  else if (c.endsOn) parts.push(`until ${formatCalendarDate(c.endsOn)}`);
  parts.push(
    c.maxRedemptions ? `used ${c.redemptions} of ${c.maxRedemptions}` : `used ${c.redemptions}`,
  );
  return parts.join(" · ");
}

/** The owner's discount codes (FR-017): create, edit, pause and resume. */
export function DiscountsEditor({ codes, today }: { codes: StoredDiscount[]; today: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | "new" | null>(codes.length ? null : "new");
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set =
    <K extends keyof Draft>(key: K) =>
    (value: Draft[K]) =>
      setDraft((d) => ({ ...d, [key]: value }));

  function submit() {
    const value =
      draft.type === "percent" ? Number(draft.amount) : rupeesToPaise(draft.amount || "x");
    const minSubtotal = draft.minOrder ? rupeesToPaise(draft.minOrder) : 0;
    if (value === null || !Number.isFinite(value) || minSubtotal === null) {
      setErrors(["Enter amounts as numbers, like 10 or 250"]);
      return;
    }
    const id = editing === "new" ? null : editing;
    start(async () => {
      const result = await saveDiscount(id, {
        code: draft.code,
        type: draft.type,
        value,
        minSubtotal,
        startsOn: draft.startsOn,
        endsOn: draft.endsOn,
        maxRedemptions: draft.maxUses ? Number(draft.maxUses) : null,
        active: draft.active,
      });
      if (result.ok) {
        setSaved(`${draft.code.toUpperCase().replace(/\s+/g, "")} is saved`);
        setErrors([]);
        setEditing(null);
        setDraft(EMPTY);
        router.refresh();
      } else setErrors(result.errors);
    });
  }

  return (
    <div className="mt-6 grid gap-4">
      {saved && (
        <p role="status" className="font-bold text-pistachio-700">
          {saved}
        </p>
      )}

      {editing === null && (
        <button
          type="button"
          className={`${buttonClass.primary} justify-self-start`}
          onClick={() => {
            setDraft(EMPTY);
            setSaved(null);
            setEditing("new");
          }}
        >
          + New code
        </button>
      )}

      {editing !== null && (
        <Card>
          <form
            aria-label={editing === "new" ? "New discount code" : "Edit discount code"}
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <h2 className="font-display text-xl font-semibold">
              {editing === "new" ? "New code" : `Edit ${draft.code}`}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="discount-code" className="font-bold">
                  Code
                </label>
                <input
                  id="discount-code"
                  required
                  maxLength={20}
                  autoCapitalize="characters"
                  value={draft.code}
                  onChange={(e) => set("code")(e.target.value.toUpperCase())}
                  placeholder="DIWALI10"
                  className={`${inputClass} uppercase tracking-wider`}
                />
              </div>
              <fieldset>
                <legend className="font-bold">Takes off</legend>
                <div className="mt-1 flex gap-2">
                  <div className="flex shrink-0 rounded-[var(--radius-pill)] bg-cream-200 p-1">
                    {(
                      [
                        ["percent", "%"],
                        ["fixed", "₹"],
                      ] as const
                    ).map(([type, sign]) => (
                      <label
                        key={type}
                        className="cursor-pointer rounded-[var(--radius-pill)] px-3 py-1.5 font-bold has-checked:bg-cocoa-900 has-checked:text-cream-50"
                      >
                        <input
                          type="radio"
                          name="discount-type"
                          value={type}
                          checked={draft.type === type}
                          onChange={() => set("type")(type)}
                          className="sr-only"
                        />
                        {sign}
                        <span className="sr-only">
                          {type === "percent" ? " Percentage" : " Rupees"}
                        </span>
                      </label>
                    ))}
                  </div>
                  <label htmlFor="discount-amount" className="sr-only">
                    Amount off
                  </label>
                  <input
                    id="discount-amount"
                    required
                    inputMode="decimal"
                    value={draft.amount}
                    onChange={(e) => set("amount")(e.target.value)}
                    placeholder={draft.type === "percent" ? "10" : "200"}
                    className={`${inputClass} mt-0 w-28`}
                  />
                </div>
              </fieldset>
              <div>
                <label htmlFor="discount-min" className="font-bold">
                  Minimum order (₹, optional)
                </label>
                <input
                  id="discount-min"
                  inputMode="decimal"
                  value={draft.minOrder}
                  onChange={(e) => set("minOrder")(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="discount-max" className="font-bold">
                  How many times it can be used (optional)
                </label>
                <input
                  id="discount-max"
                  inputMode="numeric"
                  value={draft.maxUses}
                  onChange={(e) => set("maxUses")(e.target.value.replace(/\D/g, ""))}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="discount-from" className="font-bold">
                  First day (optional)
                </label>
                <input
                  id="discount-from"
                  type="date"
                  value={draft.startsOn}
                  onChange={(e) => set("startsOn")(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="discount-until" className="font-bold">
                  Last day (optional)
                </label>
                <input
                  id="discount-until"
                  type="date"
                  value={draft.endsOn}
                  onChange={(e) => set("endsOn")(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 font-bold">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(e) => set("active")(e.target.checked)}
                className="h-5 w-5 accent-cocoa-900"
              />
              Customers can use it
            </label>
            {errors.length > 0 && (
              <ul role="alert" className="font-bold text-blush-700">
                {errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={pending} className={buttonClass.primary}>
                {pending ? "Saving…" : "Save code"}
              </button>
              {codes.length > 0 && (
                <button
                  type="button"
                  className={buttonClass.quiet}
                  onClick={() => {
                    setEditing(null);
                    setErrors([]);
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </Card>
      )}

      {codes.length > 0 && (
        <ul aria-label="Your discount codes" className="grid gap-3 md:grid-cols-2">
          {codes.map((c) => {
            const state = standing(c, today);
            return (
              <li key={c.id}>
                <Card className="h-full">
                  <div className="flex items-start justify-between gap-3">
                    <p>
                      <span className="font-display text-xl font-semibold tracking-wide">
                        {c.code}
                      </span>{" "}
                      <span className="font-bold text-blush-700">{describeDiscount(c)}</span>
                    </p>
                    <span
                      className={`whitespace-nowrap rounded-[var(--radius-pill)] px-3 py-1 text-sm font-bold ${state.tone}`}
                    >
                      {state.label}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-cocoa-700">{conditions(c)}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={buttonClass.soft}
                      onClick={() => {
                        setDraft(toDraft(c));
                        setSaved(null);
                        setErrors([]);
                        setEditing(c.id);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      className={buttonClass.quiet}
                      onClick={() =>
                        start(async () => {
                          await setDiscountActive(c.id, !c.active);
                          router.refresh();
                        })
                      }
                    >
                      {c.active ? `Pause ${c.code}` : `Resume ${c.code}`}
                    </button>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
