import { describe, it, expect } from "vitest";
import {
  buildCalendarGrid,
  countMajoredWeeks,
  countWorkedDays,
  formatFrenchNumber,
  formatEuro,
} from "../calendar-utils";

describe("buildCalendarGrid", () => {
  it("builds a grid for February 2026 (starts on Sunday)", () => {
    const month = new Date(2026, 1, 1); // February 2026
    const grid = buildCalendarGrid(month);

    // Feb 2026: starts on Sunday, ends on Saturday
    // Grid should start from Monday Jan 26
    expect(grid.length).toBeGreaterThanOrEqual(4);

    const firstDay = grid[0].days[0];
    expect(firstDay.date.getDate()).toBe(26);
    expect(firstDay.date.getMonth()).toBe(0); // January
    expect(firstDay.isCurrentMonth).toBe(false);
    expect(firstDay.isToggleable).toBe(true); // previous month = toggleable
  });

  it("marks end-of-month overflow as not toggleable", () => {
    const month = new Date(2026, 1, 1); // February 2026
    const grid = buildCalendarGrid(month);

    const lastWeek = grid[grid.length - 1];
    const overflowDays = lastWeek.days.filter((d) => !d.isCurrentMonth);
    for (const day of overflowDays) {
      if (day.isBusinessDay) {
        expect(day.isToggleable).toBe(false);
      }
    }
  });

  it("marks weekends as non-business days", () => {
    const month = new Date(2026, 1, 1);
    const grid = buildCalendarGrid(month);

    for (const week of grid) {
      // Saturday (index 5) and Sunday (index 6) should not be business days
      expect(week.days[5].isBusinessDay).toBe(false);
      expect(week.days[6].isBusinessDay).toBe(false);
    }
  });

  it("each week has exactly 7 days", () => {
    const month = new Date(2026, 3, 1); // April 2026
    const grid = buildCalendarGrid(month);

    for (const week of grid) {
      expect(week.days.length).toBe(7);
    }
  });
});

describe("countWorkedDays", () => {
  it("counts all business days when none are off", () => {
    // February 2026 has 20 business days
    const month = new Date(2026, 1, 1);
    const daysOff = new Set<string>();
    expect(countWorkedDays(month, daysOff)).toBe(20);
  });

  it("subtracts days off from count", () => {
    const month = new Date(2026, 1, 1);
    const daysOff = new Set(["2026-02-02", "2026-02-03", "2026-02-04"]);
    expect(countWorkedDays(month, daysOff)).toBe(17);
  });

  it("ignores weekend days in daysOff", () => {
    const month = new Date(2026, 1, 1);
    // Feb 1 2026 is a Sunday, should not affect count
    const daysOff = new Set(["2026-02-01"]);
    expect(countWorkedDays(month, daysOff)).toBe(20);
  });
});

describe("countMajoredWeeks", () => {
  it("counts full weeks with no days off", () => {
    // February 2026: Mon-Fri weeks fully within Feb
    // Feb 2-6, 9-13, 16-20, 23-27 = 4 full weeks within Feb
    // Week Jan 26-30 spans Jan/Feb → counts for Feb (later month)
    // But Jan 26-30 is entirely in January, so it counts for January, not Feb
    // Actually: Jan 26 (Mon) to Jan 30 (Fri) are all in January → counts for Jan
    // So Feb should have 4 full weeks
    const month = new Date(2026, 1, 1);
    const daysOff = new Set<string>();
    expect(countMajoredWeeks(month, daysOff)).toBe(4);
  });

  it("returns 0 if a day is off in every week", () => {
    // Remove one day from each full week in February 2026
    const month = new Date(2026, 1, 1);
    const daysOff = new Set([
      "2026-02-02", // Week 1
      "2026-02-09", // Week 2
      "2026-02-16", // Week 3
      "2026-02-23", // Week 4
    ]);
    expect(countMajoredWeeks(month, daysOff)).toBe(0);
  });

  it("cross-month week counts for the later month", () => {
    // March 2026 starts on Sunday
    // Week Mon Mar 30 - Fri Apr 3 spans March/April → counts for April
    // So for March, that end-of-month week should NOT count
    const march = new Date(2026, 2, 1);
    const daysOff = new Set<string>();
    const marchCount = countMajoredWeeks(march, daysOff);

    // March 2026: full weeks Mon-Fri entirely in March:
    // Mar 2-6, 9-13, 16-20, 23-27 = 4 weeks
    // Mar 30-31 + Apr 1-3 spans months → counts for April
    expect(marchCount).toBe(4);
  });

  it("cross-month week at start counts for displayed month", () => {
    // April 2026 starts on Wednesday
    // Week Mon Mar 30 - Fri Apr 3 spans March/April → counts for April (later month)
    const april = new Date(2026, 3, 1);
    const daysOff = new Set<string>();
    const aprilCount = countMajoredWeeks(april, daysOff);

    // April 2026:
    // Mar30-Apr3 (cross-month, counts for April)
    // Apr 6-10, 13-17, 20-24, 27-May1
    // Apr 27-May 1 crosses into May → counts for May, not April
    // So: 1 (cross from March) + 3 (fully in April: 6-10, 13-17, 20-24) = 4
    expect(aprilCount).toBe(4);
  });
});

describe("formatFrenchNumber", () => {
  it("uses comma as decimal separator", () => {
    expect(formatFrenchNumber(123.45)).toBe("123,45");
  });

  it("respects decimal places parameter", () => {
    expect(formatFrenchNumber(1.5, 1)).toBe("1,5");
  });
});

describe("formatEuro", () => {
  it("formats with euro sign", () => {
    expect(formatEuro(532.8)).toBe("532,80 €");
  });
});
