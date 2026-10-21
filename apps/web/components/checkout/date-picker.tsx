"use client";

import type { Availability } from "@cozycakes/core";

type Day = Availability["days"][number];

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const why: Record<Day["status"], string> = {
  available: "",
  too_soon: "too soon to bake",
  full: "fully booked",
  blocked: "not baking",
};

function parts(date: string) {
  const d = new Date(`${date}T00:00:00Z`);
  return {
    day: d.getUTCDate(),
    // Monday-first column, 0–6.
    column: (d.getUTCDay() + 6) % 7,
    month: new Intl.DateTimeFormat("en-IN", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(d),
    label: new Intl.DateTimeFormat("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: "UTC",
    }).format(d),
  };
}

/**
 * Month calendars of orderable days (FR-011, US3 scenario 1). Each day is a radio, so the whole
 * calendar is one keyboard-friendly group; days that can't be picked say why.
 */
export function DatePicker({
  days,
  value,
  onChange,
}: {
  days: Day[];
  value: string | null;
  onChange: (date: string) => void;
}) {
  const months = new Map<string, Day[]>();
  for (const day of days) {
    const { month } = parts(day.date);
    months.set(month, [...(months.get(month) ?? []), day]);
  }
  // Start at the first month with a day to pick (the rest of this month may be too soon).
  const all = [...months];
  const first = all.findIndex(([, list]) => list.some((d) => d.status === "available"));
  const visible = first === -1 ? all : all.slice(first);

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {visible.map(([month, list]) => (
        <fieldset key={month} className="min-w-0">
          <legend className="font-display text-lg font-semibold">{month}</legend>
          <div
            aria-hidden="true"
            className="mt-2 grid grid-cols-7 text-center text-xs font-bold text-cocoa-700"
          >
            {WEEKDAYS.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {list.map((day, i) => {
              const p = parts(day.date);
              const open = day.status === "available";
              const few = open && day.remaining === 1;
              return (
                <label
                  key={day.date}
                  style={i === 0 ? { gridColumnStart: p.column + 1 } : undefined}
                  title={open ? (few ? "Last spot" : undefined) : why[day.status]}
                  className={`relative grid aspect-square place-items-center rounded-[var(--radius-sm)] text-sm font-bold transition-all ${
                    open
                      ? "cursor-pointer bg-cream-50 ring-1 ring-cocoa-900/10 hover:bg-blush-100 has-checked:scale-105 has-checked:bg-cocoa-900 has-checked:text-cream-50 has-checked:shadow-[var(--shadow-soft)] has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-blush-700"
                      : day.status === "full"
                        ? "bg-caramel-200/50 text-cocoa-700 line-through decoration-cocoa-700/60"
                        : "font-normal text-cocoa-700"
                  }`}
                >
                  <input
                    type="radio"
                    name="date"
                    value={day.date}
                    checked={value === day.date}
                    disabled={!open}
                    onChange={() => onChange(day.date)}
                    aria-label={`${p.label}${open ? (few ? ", last spot" : "") : `, ${why[day.status]}`}`}
                    className="sr-only"
                  />
                  {p.day}
                  {few && (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-blush-700"
                    />
                  )}
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-cocoa-700 sm:col-span-2">
        <li className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-cream-50 ring-1 ring-cocoa-900/20" /> Open
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-blush-700" /> Last spot
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-caramel-200" /> Fully booked
        </li>
        <li>Plain numbers are too soon or days off</li>
      </ul>
    </div>
  );
}
