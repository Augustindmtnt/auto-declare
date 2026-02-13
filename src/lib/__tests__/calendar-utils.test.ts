import { describe, it, expect } from "vitest";
import {
  buildCalendarGrid,
  computeMajoredHours,
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

describe("computeMajoredHours", () => {
  it("computes 0.75h per full week with no days off (Feb 2026)", () => {
    // Feb 2026: 4 full weeks within Feb, no bank holidays
    // Each full week: 4×9.25 + 8.75 = 45.75h → 0.75h majored
    // Total: 4 × 0.75 = 3h
    const month = new Date(2026, 1, 1);
    const daysOff = new Set<string>();
    expect(computeMajoredHours(month, daysOff)).toBe(3);
  });

  it("returns 0 if a day is off in every week", () => {
    const month = new Date(2026, 1, 1);
    const daysOff = new Set([
      "2026-02-02", // Week 1
      "2026-02-09", // Week 2
      "2026-02-16", // Week 3
      "2026-02-23", // Week 4
    ]);
    // Max hours per broken week: 4×9.25 or 3×9.25+8.75 = 37 or 36.5 < 45
    expect(computeMajoredHours(month, daysOff)).toBe(0);
  });

  it("cross-month week counts for the later month", () => {
    const march = new Date(2026, 2, 1);
    const daysOff = new Set<string>();
    const marchHours = computeMajoredHours(march, daysOff);

    // March 2026: 4 full weeks entirely in March, each 0.75h
    // Mar 30-31 + Apr 1-3 spans months → counts for April
    expect(marchHours).toBe(3);
  });

  it("cross-month week at start counts for displayed month", () => {
    const april = new Date(2026, 3, 1);
    const daysOff = new Set<string>();
    const aprilHours = computeMajoredHours(april, daysOff);

    // April 2026:
    // Mar30-Apr3 (cross-month, counts for April): 0.75h
    // Apr 6-10 (Easter Monday Apr 6 is bank holiday → 3×9.25+8.75=36.5 < 45 → 0h)
    // Apr 13-17: 0.75h
    // Apr 20-24: 0.75h
    // Apr 27-May1 crosses into May → counts for May
    // Total: 0.75 + 0 + 0.75 + 0.75 = 2.25h
    expect(aprilHours).toBe(2.25);
  });

  it("sick leave days reduce weekly hours", () => {
    const month = new Date(2026, 1, 1);
    const daysOff = new Set<string>();
    const sickLeaveDays = new Set(["2026-02-02"]); // Mon removed from week Feb 2-6
    // That week: 3×9.25 + 8.75 = 36.5h < 45 → 0h majored
    // Other 3 weeks still full → 3 × 0.75 = 2.25h
    expect(computeMajoredHours(month, daysOff, sickLeaveDays)).toBe(2.25);
  });

  it("bank holidays reduce weekly hours below threshold", () => {
    // May 2026: May 1 (Fri) is a bank holiday
    // Week Apr 27 - May 1: May 1 is bank holiday → 4×9.25 = 37h < 45 → 0h
    // This week crosses months so it counts for May
    const may = new Date(2026, 4, 1);
    const daysOff = new Set<string>();
    const hours = computeMajoredHours(may, daysOff);

    // May 2026 weeks:
    // Apr27-May1: crosses months → May. May 1 bank holiday → 37h < 45 → 0h
    // May 4-8: May 8 bank holiday → 4×9.25=37h < 45 → 0h
    // May 11-15: May 14 (Ascension) bank holiday → 3×9.25+8.75=36.5h < 45 → 0h
    // May 18-22: no holidays → 45.75h → 0.75h
    // May 25-29: May 25 (Pentecôte) bank holiday → 3×9.25+8.75=36.5h < 45 → 0h
    expect(hours).toBe(0.75);
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
