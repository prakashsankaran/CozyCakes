import { describe, expect, it } from "vitest";
import {
  addDays,
  earliestFulfilmentDate,
  formatCalendarDate,
  isCalendarDate,
  todayIn,
} from "../src/dates";

describe("dates", () => {
  it("computes today in the bakery time zone, not UTC", () => {
    // 20:00 UTC on 20 Oct is 01:30 on 21 Oct in India.
    const now = new Date("2026-10-20T20:00:00Z");
    expect(todayIn("Asia/Kolkata", now)).toBe("2026-10-21");
    expect(todayIn("UTC", now)).toBe("2026-10-20");
  });

  it("adds days across month and year ends", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 2)).toBe("2027-01-02");
  });

  it("applies lead time from the bakery's today (spec US3 scenario 1)", () => {
    // Monday 19 Oct 2026, 10:00 IST: a 2-day cake is earliest on Wednesday.
    const mondayMorning = new Date("2026-10-19T04:30:00Z");
    expect(earliestFulfilmentDate(2, "Asia/Kolkata", mondayMorning)).toBe("2026-10-21");
  });

  it("treats negative lead time as zero", () => {
    const now = new Date("2026-10-19T04:30:00Z");
    expect(earliestFulfilmentDate(-1, "Asia/Kolkata", now)).toBe("2026-10-19");
  });

  it("validates calendar dates", () => {
    expect(isCalendarDate("2026-02-28")).toBe(true);
    expect(isCalendarDate("2026-02-30")).toBe(false);
    expect(isCalendarDate("20261020")).toBe(false);
  });

  it("formats friendly labels", () => {
    expect(formatCalendarDate("2026-10-21")).toBe("Wed, 21 Oct");
  });
});
