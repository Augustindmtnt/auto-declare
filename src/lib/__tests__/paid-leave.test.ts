import { describe, it, expect } from "vitest";
import {
  getReferencePeriod,
  getPreviousReferencePeriod,
  computeWorkedWeeks,
  computeAcquiredPaidLeave,
  countPaidLeaveTakenInPeriod,
  computePaidLeaveSaturdayDays,
} from "../paid-leave";

describe("getReferencePeriod", () => {
  it("returns June–May of same year for a June date", () => {
    const period = getReferencePeriod(new Date(2025, 5, 15)); // June 15, 2025
    expect(period.start).toEqual(new Date(2025, 5, 1));
    expect(period.end).toEqual(new Date(2026, 4, 31));
  });

  it("returns June–May of same year for a December date", () => {
    const period = getReferencePeriod(new Date(2025, 11, 1)); // Dec 1, 2025
    expect(period.start).toEqual(new Date(2025, 5, 1));
    expect(period.end).toEqual(new Date(2026, 4, 31));
  });

  it("returns previous June–May for a February date", () => {
    const period = getReferencePeriod(new Date(2026, 1, 15)); // Feb 15, 2026
    expect(period.start).toEqual(new Date(2025, 5, 1));
    expect(period.end).toEqual(new Date(2026, 4, 31));
  });

  it("returns previous June–May for a May date", () => {
    const period = getReferencePeriod(new Date(2026, 4, 31)); // May 31, 2026
    expect(period.start).toEqual(new Date(2025, 5, 1));
    expect(period.end).toEqual(new Date(2026, 4, 31));
  });

  it("returns June–May for June 1 boundary", () => {
    const period = getReferencePeriod(new Date(2025, 5, 1)); // June 1, 2025
    expect(period.start).toEqual(new Date(2025, 5, 1));
    expect(period.end).toEqual(new Date(2026, 4, 31));
  });
});

describe("getPreviousReferencePeriod", () => {
  it("returns previous period for a date in current period", () => {
    const period = getPreviousReferencePeriod(new Date(2026, 1, 15)); // Feb 2026
    // Current period: June 2025 – May 2026
    // Previous period: June 2024 – May 2025
    expect(period.start).toEqual(new Date(2024, 5, 1));
    expect(period.end).toEqual(new Date(2025, 4, 31));
  });

  it("returns previous period for a June date", () => {
    const period = getPreviousReferencePeriod(new Date(2025, 5, 15)); // June 2025
    // Current: June 2025–May 2026, Previous: June 2024–May 2025
    expect(period.start).toEqual(new Date(2024, 5, 1));
    expect(period.end).toEqual(new Date(2025, 4, 31));
  });
});

describe("computeWorkedWeeks", () => {
  const noAbsences = new Set<string>();

  it("computes roughly 52 weeks for a full year with no absences", () => {
    const start = new Date(2025, 5, 1); // June 1, 2025
    const end = new Date(2026, 4, 31);  // May 31, 2026
    const weeks = computeWorkedWeeks(start, end, noAbsences, noAbsences, noAbsences);
    // ~52 weeks, minus bank holidays reducing some week fractions
    expect(weeks).toBeGreaterThan(49);
    expect(weeks).toBeLessThanOrEqual(52);
  });

  it("reduces worked weeks when sick days are present", () => {
    const start = new Date(2025, 5, 1);
    const end = new Date(2026, 4, 31);
    const fullWeeks = computeWorkedWeeks(start, end, noAbsences, noAbsences, noAbsences);

    // Mark an entire week as sick (Mon June 2 – Fri June 6, 2025)
    const sickDays = new Set(["2025-06-02", "2025-06-03", "2025-06-04", "2025-06-05", "2025-06-06"]);
    const reducedWeeks = computeWorkedWeeks(start, end, noAbsences, sickDays, noAbsences);

    expect(reducedWeeks).toBeLessThan(fullWeeks);
    expect(fullWeeks - reducedWeeks).toBeCloseTo(1, 1);
  });

  it("counts paid leave days as worked", () => {
    const start = new Date(2025, 5, 1);
    const end = new Date(2026, 4, 31);
    const fullWeeks = computeWorkedWeeks(start, end, noAbsences, noAbsences, noAbsences);

    // Mark a week as paid leave — should still count as worked
    const paidLeaveDays = new Set(["2025-06-02", "2025-06-03", "2025-06-04", "2025-06-05", "2025-06-06"]);
    const withPaidLeave = computeWorkedWeeks(start, end, noAbsences, noAbsences, paidLeaveDays);

    expect(withPaidLeave).toEqual(fullWeeks);
  });

  it("bank holidays count as worked (paid days)", () => {
    // 2026-01-01 is a bank holiday (Thursday)
    // Week of Dec 29, 2025 – Jan 2, 2026
    const start = new Date(2025, 11, 29); // Mon Dec 29
    const end = new Date(2026, 0, 2);     // Fri Jan 2
    const weeks = computeWorkedWeeks(start, end, noAbsences, noAbsences, noAbsences);
    // Bank holiday does not reduce the week → 5/5 = 1.0
    expect(weeks).toBe(1);
  });

  it("counts full week when Monday is in period but Fri overflows", () => {
    // Period ends Wed May 31, 2028 — the week of Mon May 29 should count fully
    const start = new Date(2028, 4, 29); // Mon May 29
    const end = new Date(2028, 4, 31);   // Wed May 31
    const weeks = computeWorkedWeeks(start, end, noAbsences, noAbsences, noAbsences);
    // Full Mon–Fri evaluated even though Thu/Fri are past periodEnd → 5/5 = 1.0
    expect(weeks).toBe(1);
  });

  it("returns 0 for an empty range", () => {
    const start = new Date(2025, 5, 7);  // Saturday
    const end = new Date(2025, 5, 8);    // Sunday
    const weeks = computeWorkedWeeks(start, end, noAbsences, noAbsences, noAbsences);
    expect(weeks).toBe(0);
  });
});

describe("computeAcquiredPaidLeave", () => {
  it("returns 0 for 0 weeks", () => {
    expect(computeAcquiredPaidLeave(0)).toBe(0);
  });

  it("returns correct value for 4 weeks", () => {
    // ceil(4 / 4 * 2.5) = ceil(2.5) = 3
    expect(computeAcquiredPaidLeave(4)).toBe(3);
  });

  it("returns correct value for 8 weeks", () => {
    // ceil(8 / 4 * 2.5) = ceil(5) = 5
    expect(computeAcquiredPaidLeave(8)).toBe(5);
  });

  it("returns correct value for partial weeks", () => {
    // ceil(10 / 4 * 2.5) = ceil(6.25) = 7
    expect(computeAcquiredPaidLeave(10)).toBe(7);
  });

  it("caps at 30 for a full year (~52 weeks)", () => {
    // ceil(52 / 4 * 2.5) = ceil(32.5) = 33 → capped at 30
    expect(computeAcquiredPaidLeave(52)).toBe(30);
  });

  it("caps at 30 for 48 weeks", () => {
    // ceil(48 / 4 * 2.5) = ceil(30) = 30
    expect(computeAcquiredPaidLeave(48)).toBe(30);
  });
});

describe("countPaidLeaveTakenInPeriod", () => {
  it("counts paid leave days within the period", () => {
    const paidLeaveDays = new Set([
      "2025-07-01",
      "2025-07-02",
      "2025-12-25",
      "2024-05-15", // outside period
    ]);
    const count = countPaidLeaveTakenInPeriod(
      new Date(2025, 5, 1),  // June 1, 2025
      new Date(2026, 4, 31), // May 31, 2026
      paidLeaveDays
    );
    expect(count).toBe(3);
  });

  it("returns 0 when no paid leave days are in the period", () => {
    const paidLeaveDays = new Set(["2024-03-15"]);
    const count = countPaidLeaveTakenInPeriod(
      new Date(2025, 5, 1),
      new Date(2026, 4, 31),
      paidLeaveDays
    );
    expect(count).toBe(0);
  });

  it("handles boundary dates correctly", () => {
    const paidLeaveDays = new Set([
      "2025-06-01", // first day of period
      "2026-05-31", // last day of period (weekend, but still counted)
      "2026-06-01", // outside
    ]);
    const count = countPaidLeaveTakenInPeriod(
      new Date(2025, 5, 1),
      new Date(2026, 4, 31),
      paidLeaveDays
    );
    expect(count).toBe(2);
  });

  it("also counts auto-Saturday days", () => {
    const paidLeaveDays = new Set(["2025-07-04"]); // Friday
    const autoSaturdays = new Set(["2025-07-05"]);  // Saturday
    const count = countPaidLeaveTakenInPeriod(
      new Date(2025, 5, 1),
      new Date(2026, 4, 31),
      paidLeaveDays,
      autoSaturdays
    );
    expect(count).toBe(2);
  });
});

describe("computePaidLeaveSaturdayDays", () => {
  const periodStart = new Date(2025, 5, 1);  // June 1, 2025
  const periodEnd   = new Date(2026, 4, 31); // May 31, 2026
  const noBankHolidays = new Set<string>();

  it("includes the Saturday after a paid-leave Friday when balance >= 2", () => {
    // 2025-07-04 is a Friday
    const paidLeaveDays = new Set(["2025-07-04"]);
    const result = computePaidLeaveSaturdayDays(
      paidLeaveDays, noBankHolidays, 5, periodStart, periodEnd
    );
    expect(result.has("2025-07-05")).toBe(true);
    expect(result.size).toBe(1);
  });

  it("excludes the Saturday when balance is only 1 before Friday", () => {
    // balance=1 → after consuming Friday remaining=0 → Saturday cannot be added
    const paidLeaveDays = new Set(["2025-07-04"]);
    const result = computePaidLeaveSaturdayDays(
      paidLeaveDays, noBankHolidays, 1, periodStart, periodEnd
    );
    expect(result.size).toBe(0);
  });

  it("excludes the Saturday when it is a bank holiday", () => {
    // 2026-05-01 is Fête du Travail (bank holiday)
    // The preceding Friday is 2026-04-30
    const paidLeaveDays = new Set(["2026-04-30"]); // Friday
    const bankHolidays  = new Set(["2026-05-01"]); // Saturday is bank holiday
    const result = computePaidLeaveSaturdayDays(
      paidLeaveDays, bankHolidays, 10, periodStart, periodEnd
    );
    expect(result.has("2026-05-01")).toBe(false);
    expect(result.size).toBe(0);
  });

  it("handles multiple Fridays and tracks running balance", () => {
    // Two Fridays with balance=3: first Fri+Sat consumes 2, leaving 1 for second Fri only
    const paidLeaveDays = new Set(["2025-07-04", "2025-07-11"]); // two Fridays
    const result = computePaidLeaveSaturdayDays(
      paidLeaveDays, noBankHolidays, 3, periodStart, periodEnd
    );
    // First Friday: remaining before=3 → consumes Fri(rem=2) + Sat(rem=1) → Saturday counted
    // Second Friday: remaining before=1 → consumes Fri(rem=0) → Saturday NOT counted (rem<1)
    expect(result.has("2025-07-05")).toBe(true);
    expect(result.has("2025-07-12")).toBe(false);
    expect(result.size).toBe(1);
  });

  it("does not include Saturday for non-Friday paid leave days", () => {
    // Monday, Tuesday, Wednesday — no Friday
    const paidLeaveDays = new Set(["2025-07-07", "2025-07-08", "2025-07-09"]);
    const result = computePaidLeaveSaturdayDays(
      paidLeaveDays, noBankHolidays, 10, periodStart, periodEnd
    );
    expect(result.size).toBe(0);
  });

  it("ignores paid leave days outside the period", () => {
    // Friday outside the period
    const paidLeaveDays = new Set(["2024-05-30"]); // before June 2025
    const result = computePaidLeaveSaturdayDays(
      paidLeaveDays, noBankHolidays, 10, periodStart, periodEnd
    );
    expect(result.size).toBe(0);
  });
});
