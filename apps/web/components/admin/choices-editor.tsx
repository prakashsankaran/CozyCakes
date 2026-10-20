"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { rupeesToPaise, type OptionGroupInput } from "@cozycakes/core";
import type { AdminOptionGroup } from "@cozycakes/db";
import { saveOptionGroup } from "@/app/(admin)/admin/actions";
import { Card, buttonClass, inputClass } from "./ui";

/** Edit option groups and their choices (FR-021, tasks T050). Prices are typed in rupees. */
export function ChoicesEditor({ groups }: { groups: AdminOptionGroup[] }) {
  const [adding, setAdding] = useState(false);
  return (
    <div className="mt-6 grid gap-5">
      {groups.map((g) => (
        <GroupForm key={g.id} group={g} />
      ))}
      {adding ? (
        <GroupForm group={null} onDone={() => setAdding(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className={`${buttonClass.primary} justify-self-start`}
        >
          + Add a group of choices
        </button>
      )}
    </div>
  );
}

type Row = {
  key: string;
  id?: string;
  name: string;
  price: string;
  swatch: string;
  useSwatch: boolean;
  active: boolean;
};
let k = 0;
const key = () => `opt-${++k}`;

function GroupForm({ group, onDone }: { group: AdminOptionGroup | null; onDone?: () => void }) {
  const router = useRouter();
  const [name, setName] = useState(group?.name ?? "");
  const [kind, setKind] = useState<OptionGroupInput["kind"]>(group?.kind ?? "single");
  const [required, setRequired] = useState(group?.required ?? false);
  const [maxSelect, setMaxSelect] = useState(String(group?.maxSelect ?? ""));
  const [rows, setRows] = useState<Row[]>(
    (group?.options ?? []).map((o) => ({
      key: key(),
      id: o.id,
      name: o.name,
      price: String(o.priceDelta / 100),
      swatch: o.swatch ?? "#F4B6C2",
      useSwatch: o.swatch !== null,
      active: o.active,
    })),
  );
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const id = group?.id ?? "new";
  const setRow = (rowKey: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === rowKey ? { ...r, ...patch } : r)));

  const save = () => {
    const bad = rows.find((r) => rupeesToPaise(r.price || "0") === null);
    if (bad) {
      setMessage({ ok: false, text: `Check the price for "${bad.name || "a choice"}"` });
      return;
    }
    start(async () => {
      const result = await saveOptionGroup({
        id: group?.id,
        name,
        kind,
        required,
        maxSelect: kind === "multi" && maxSelect ? Number(maxSelect) : null,
        options: rows.map((r) => ({
          id: r.id,
          name: r.name,
          priceDelta: rupeesToPaise(r.price || "0")!,
          swatch: r.useSwatch ? r.swatch.toUpperCase() : null,
          active: r.active,
        })),
      });
      if (result.ok) {
        setMessage({ ok: true, text: `Saved ${name}` });
        onDone?.();
        router.refresh();
      } else setMessage({ ok: false, text: result.errors[0]! });
    });
  };

  return (
    <Card>
      <form
        aria-label={group ? `${group.name} choices` : "New group of choices"}
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <div>
            <label htmlFor={`${id}-name`} className="font-bold">
              Group name
            </label>
            <input
              id={`${id}-name`}
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Flavour"
              className={`${inputClass} font-display text-lg`}
            />
          </div>
          <div>
            <label htmlFor={`${id}-kind`} className="font-bold">
              Customers pick
            </label>
            <select
              id={`${id}-kind`}
              value={kind}
              onChange={(e) => setKind(e.target.value as OptionGroupInput["kind"])}
              className={inputClass}
            >
              <option value="single">One</option>
              <option value="multi">Several</option>
            </select>
          </div>
          {kind === "multi" ? (
            <div>
              <label htmlFor={`${id}-max`} className="font-bold">
                Up to
              </label>
              <input
                id={`${id}-max`}
                type="number"
                min={1}
                max={20}
                value={maxSelect}
                onChange={(e) => setMaxSelect(e.target.value)}
                className={`${inputClass} w-24`}
              />
            </div>
          ) : (
            <label className="flex items-center gap-2 font-bold sm:pb-3">
              <input
                type="checkbox"
                checked={required}
                onChange={(e) => setRequired(e.target.checked)}
                className="h-5 w-5 accent-[var(--color-blush-700)]"
              />
              Must pick one
            </label>
          )}
        </div>
        {group && group.usedBy > 0 && (
          <p className="mt-2 text-sm text-cocoa-700">
            Offered on {group.usedBy} {group.usedBy === 1 ? "cake" : "cakes"}.
          </p>
        )}

        <ul className="mt-4 grid gap-2">
          {rows.map((r) => (
            <li
              key={r.key}
              className="grid grid-cols-[1fr_6rem] gap-2 rounded-[var(--radius-md)] bg-cream-100 p-3 sm:grid-cols-[1fr_7rem_auto_auto_auto] sm:items-end"
            >
              <div>
                <label htmlFor={`${r.key}-name`} className="text-sm font-bold">
                  Choice
                </label>
                <input
                  id={`${r.key}-name`}
                  required
                  value={r.name}
                  onChange={(e) => setRow(r.key, { name: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor={`${r.key}-price`} className="text-sm font-bold">
                  Extra (₹)
                </label>
                <input
                  id={`${r.key}-price`}
                  inputMode="decimal"
                  value={r.price}
                  onChange={(e) => setRow(r.key, { price: e.target.value })}
                  placeholder="0"
                  className={inputClass}
                />
              </div>
              <div className="flex items-center gap-2 sm:pb-2">
                <input
                  type="checkbox"
                  id={`${r.key}-useswatch`}
                  checked={r.useSwatch}
                  onChange={(e) => setRow(r.key, { useSwatch: e.target.checked })}
                  className="h-5 w-5 accent-[var(--color-blush-700)]"
                />
                <label htmlFor={`${r.key}-useswatch`} className="text-sm font-bold">
                  Colour
                </label>
                {r.useSwatch && (
                  <input
                    type="color"
                    aria-label={`Colour of ${r.name || "choice"}`}
                    value={r.swatch}
                    onChange={(e) => setRow(r.key, { swatch: e.target.value })}
                    className="h-9 w-10 rounded"
                  />
                )}
              </div>
              <label className="flex items-center gap-2 text-sm font-bold sm:pb-3">
                <input
                  type="checkbox"
                  checked={r.active}
                  onChange={(e) => setRow(r.key, { active: e.target.checked })}
                  className="h-5 w-5 accent-[var(--color-blush-700)]"
                />
                Offered
              </label>
              <button
                type="button"
                onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                className={buttonClass.quiet}
                aria-label={`Remove ${r.name || "choice"}`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setRows((rs) => [
                ...rs,
                {
                  key: key(),
                  name: "",
                  price: "",
                  swatch: "#F4B6C2",
                  useSwatch: false,
                  active: true,
                },
              ])
            }
            className={buttonClass.soft}
          >
            + Add a choice
          </button>
          <button type="submit" disabled={pending} className={buttonClass.primary}>
            {pending ? "Saving…" : group ? `Save ${group.name}` : "Save group"}
          </button>
          {onDone && (
            <button type="button" onClick={onDone} className={buttonClass.quiet}>
              Cancel
            </button>
          )}
          {message && (
            <p
              role={message.ok ? "status" : "alert"}
              className={`font-bold ${message.ok ? "text-pistachio-700" : "text-blush-700"}`}
            >
              {message.text}
            </p>
          )}
        </div>
      </form>
    </Card>
  );
}
