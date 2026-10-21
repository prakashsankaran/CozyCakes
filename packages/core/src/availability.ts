import { addDays, type CalendarDate } from "./dates";

/**
 * Which days a cart can be fulfilled on (FR-011, data-model.md "Availability rules"). Pure, so the
 * server, the checkout calendar and a future mobile app all agree. Capacity counts orders, not
 * cakes: each confirmed order or unexpired checkout hold takes one place on its date.
 */

export type DayStatus = "available" | "full" | "blocked" | "too_soon";

export type CalendarDay = { date: CalendarDate; status: DayStatus; remaining: number };

export type DayOverride = { date: CalendarDate; blocked: boolean; capacityOverride: number | null };

export type AvailabilityRules = {
  /** Today in the bakery's time zone. */
  today: CalendarDate;
  /** Longest lead time among the cart's cakes. */
  leadTimeDays: number;
  bookingWindowDays: number;
  defaultDailyCapacity: number;
  overrides: DayOverride[];
  /** Confirmed orders plus unexpired holds, per date. */
  booked: Record<CalendarDate, number>;
};

/** Status of one date under `rules`; dates outside the booking window are `blocked`. */
export function dayStatus(date: CalendarDate, rules: AvailabilityRules): CalendarDay {
  const override = rules.overrides.find((o) => o.date === date);
  const capacity = override?.capacityOverride ?? rules.defaultDailyCapacity;
  const remaining = Math.max(0, capacity - (rules.booked[date] ?? 0));
  const earliest = addDays(rules.today, Math.max(0, rules.leadTimeDays));
  const last = addDays(rules.today, rules.bookingWindowDays);
  let status: DayStatus = "available";
  if (date < earliest) status = "too_soon";
  else if (date > last || override?.blocked || capacity === 0) status = "blocked";
  else if (remaining === 0) status = "full";
  return { date, status, remaining: status === "available" ? remaining : 0 };
}

/** Every date from today to the end of the booking window, with its status. */
export function buildCalendar(rules: AvailabilityRules): CalendarDay[] {
  const days: CalendarDay[] = [];
  for (let i = 0; i <= rules.bookingWindowDays; i++) {
    days.push(dayStatus(addDays(rules.today, i), rules));
  }
  return days;
}
