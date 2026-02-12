import { describe, it, expect } from "vitest";
import {
  buildCalendarGrid,
  countMajoredWeeks,
  countWorkedDays,
  formatFrenchNumber,
  formatEuro,
  computeEasterDate,
  getBankHolidays,
  getHoursForDay,
  countNormalHoursInMonth,
  countSickLeaveHours,
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

  it("also excludes sick leave days", () => {
    const month = new Date(2026, 1, 1);
    const daysOff = new Set(["2026-02-02"]);
    const sickLeaveDays = new Set(["2026-02-03", "2026-02-04"]);
    expect(countWorkedDays(month, daysOff, sickLeaveDays)).toBe(17);
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

  it("sick leave days break majored weeks", () => {
    const month = new Date(2026, 1, 1);
    const daysOff = new Set<string>();
    const sickLeaveDays = new Set(["2026-02-02"]); // breaks week Feb 2-6
    expect(countMajoredWeeks(month, daysOff, sickLeaveDays)).toBe(3);
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

describe("computeEasterDate", () => {
  it("computes Easter 2026 correctly", () => {
    // Easter 2026 is April 5
    const easter = computeEasterDate(2026);
    expect(easter.getFullYear()).toBe(2026);
    expect(easter.getMonth()).toBe(3); // April
    expect(easter.getDate()).toBe(5);
  });

  it("computes Easter 2025 correctly", () => {
    // Easter 2025 is April 20
    const easter = computeEasterDate(2025);
    expect(easter.getFullYear()).toBe(2025);
    expect(easter.getMonth()).toBe(3);
    expect(easter.getDate()).toBe(20);
  });

  it("computes Easter 2024 correctly", () => {
    // Easter 2024 is March 31
    const easter = computeEasterDate(2024);
    expect(easter.getFullYear()).toBe(2024);
    expect(easter.getMonth()).toBe(2); // March
    expect(easter.getDate()).toBe(31);
  });
});

describe("getBankHolidays", () => {
  it("returns 11 bank holidays for 2026", () => {
    const holidays = getBankHolidays(2026);
    expect(holidays.size).toBe(11);
  });

  it("includes fixed holidays", () => {
    const holidays = getBankHolidays(2026);
    expect(holidays.has("2026-01-01")).toBe(true); // Jour de l'an
    expect(holidays.has("2026-05-01")).toBe(true); // Fête du travail
    expect(holidays.has("2026-05-08")).toBe(true); // Victoire 1945
    expect(holidays.has("2026-07-14")).toBe(true); // Fête nationale
    expect(holidays.has("2026-08-15")).toBe(true); // Assomption
    expect(holidays.has("2026-11-01")).toBe(true); // Toussaint
    expect(holidays.has("2026-11-11")).toBe(true); // Armistice
    expect(holidays.has("2026-12-25")).toBe(true); // Noël
  });

  it("includes Easter-based holidays for 2026", () => {
    // Easter 2026: April 5
    const holidays = getBankHolidays(2026);
    expect(holidays.has("2026-04-06")).toBe(true); // Lundi de Pâques (Easter + 1)
    expect(holidays.has("2026-05-14")).toBe(true); // Ascension (Easter + 39)
    expect(holidays.has("2026-05-25")).toBe(true); // Lundi de Pentecôte (Easter + 50)
  });
});

describe("getHoursForDay", () => {
  it("returns 9.25 for Monday-Thursday", () => {
    // Feb 2, 2026 is Monday
    expect(getHoursForDay(new Date(2026, 1, 2))).toBe(9.25);
    // Feb 3, 2026 is Tuesday
    expect(getHoursForDay(new Date(2026, 1, 3))).toBe(9.25);
    // Feb 4, 2026 is Wednesday
    expect(getHoursForDay(new Date(2026, 1, 4))).toBe(9.25);
    // Feb 5, 2026 is Thursday
    expect(getHoursForDay(new Date(2026, 1, 5))).toBe(9.25);
  });

  it("returns 8.75 for Friday", () => {
    // Feb 6, 2026 is Friday
    expect(getHoursForDay(new Date(2026, 1, 6))).toBe(8.75);
  });

  it("returns 0 for weekends", () => {
    // Feb 7, 2026 is Saturday
    expect(getHoursForDay(new Date(2026, 1, 7))).toBe(0);
    // Feb 8, 2026 is Sunday
    expect(getHoursForDay(new Date(2026, 1, 8))).toBe(0);
  });
});

describe("countNormalHoursInMonth", () => {
  it("counts normal hours for February 2026", () => {
    // Feb 2026: 20 business days (16 Mon-Thu + 4 Fri), no bank holidays in Feb
    // 16 × 9.25 + 4 × 8.75 = 148 + 35 = 183
    const month = new Date(2026, 1, 1);
    expect(countNormalHoursInMonth(month)).toBe(183);
  });

  it("excludes bank holidays from normal hours", () => {
    // May 2026: has May 1 (Fri), May 8 (Fri), May 14 (Thu, Ascension), May 25 (Mon, Pentecôte)
    // May 2026 has 21 business days total, minus 4 bank holidays = 17 workable days
    const month = new Date(2026, 4, 1);
    const hours = countNormalHoursInMonth(month);
    // Calculate manually: May 2026 business days minus bank holidays
    // May 1 (Fri): bank holiday
    // May 4-7 (Mon-Thu): 4 × 9.25 = 37
    // May 8 (Fri): bank holiday
    // May 11-14 (Mon-Thu): 3 × 9.25 = 27.75 (May 14 is Ascension, bank holiday)
    // May 15 (Fri): 8.75
    // May 18-21 (Mon-Thu): 4 × 9.25 = 37
    // May 22 (Fri): 8.75
    // May 25 (Mon): bank holiday (Pentecôte)
    // May 26-28 (Tue-Thu): 3 × 9.25 = 27.75
    // May 29 (Fri): 8.75
    // Total: 37 + 27.75 + 8.75 + 37 + 8.75 + 27.75 + 8.75 = 155.75
    expect(hours).toBe(155.75);
  });
});

describe("countSickLeaveHours", () => {
  it("returns 0 when no sick leave days", () => {
    const month = new Date(2026, 1, 1);
    expect(countSickLeaveHours(month, new Set())).toBe(0);
  });

  it("sums hours for sick leave days", () => {
    const month = new Date(2026, 1, 1);
    // Feb 2 (Mon) = 9.25, Feb 6 (Fri) = 8.75
    const sickDays = new Set(["2026-02-02", "2026-02-06"]);
    expect(countSickLeaveHours(month, sickDays)).toBe(18);
  });

  it("ignores weekend sick leave days", () => {
    const month = new Date(2026, 1, 1);
    // Feb 7 is Saturday = 0h
    const sickDays = new Set(["2026-02-02", "2026-02-07"]);
    expect(countSickLeaveHours(month, sickDays)).toBe(9.25);
  });
});
