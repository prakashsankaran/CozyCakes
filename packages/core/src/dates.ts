/**
 * Calendar-date helpers. Fulfilment dates are plain `YYYY-MM-DD` strings in the bakery's time
 * zone (research.md §16), so "today" must be computed in that zone, never the device's.
 */
export type CalendarDate = string;

export const DEFAULT_TIME_ZONE = "Asia/Kolkata";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isCalendarDate(value: string): value is CalendarDate {
  if (!ISO_DATE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** Today's date in `timeZone` at instant `now`. */
export function todayIn(timeZone: string, now: Date = new Date()): CalendarDate {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function addDays(date: CalendarDate, days: number): CalendarDate {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Earliest date a cake with `leadTimeDays` can be fulfilled, before capacity is considered. */
export function earliestFulfilmentDate(
  leadTimeDays: number,
  timeZone: string = DEFAULT_TIME_ZONE,
  now: Date = new Date(),
): CalendarDate {
  return addDays(todayIn(timeZone, now), Math.max(0, leadTimeDays));
}

/** Friendly label such as "Wed, 22 Oct", formatted for the bakery locale. */
export function formatCalendarDate(date: CalendarDate, locale = "en-IN"): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}
