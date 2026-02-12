import { describe, it, expect } from "vitest";
import { computeDeclaration } from "../calculations";
import { CHILDREN } from "../constants";

describe("computeDeclaration", () => {
  const axelle = CHILDREN[0]; // Axelle
  const brune = CHILDREN[1]; // Brune

  it("computes Axelle's declaration for a full February 2026", () => {
    const month = new Date(2026, 1, 1);
    const daysOff = new Set<string>();
    const result = computeDeclaration(axelle, month, daysOff);

    expect(result.childName).toBe("Axelle");
    expect(result.monthlySalary).toBe(658.13);
    expect(result.workedDays).toBe(20);

    // 4 full weeks × 0.75h = 3h majored
    expect(result.majoredHoursCount).toBe(3);
    // 3h × 4.29 = 12.87
    expect(result.majoredHoursAmount).toBeCloseTo(12.87, 2);
    // No sick leave → adjustedSalary = monthlySalary
    expect(result.adjustedSalary).toBeCloseTo(658.13, 2);
    // 658.13 + 12.87 = 671.00
    expect(result.totalSalary).toBeCloseTo(671.00, 2);
    // 20 × 4 = 80
    expect(result.maintenanceAllowance).toBe(80);
    expect(result.mealAllowance).toBe(80);
    // No sick leave
    expect(result.sickLeaveDays).toBe(0);
    expect(result.sickLeaveDeduction).toBe(0);
  });

  it("computes Brune's declaration for a full February 2026", () => {
    const month = new Date(2026, 1, 1);
    const daysOff = new Set<string>();
    const result = computeDeclaration(brune, month, daysOff);

    expect(result.childName).toBe("Brune");
    expect(result.monthlySalary).toBe(691.88);
    // 3h × 4.51 = 13.53
    expect(result.majoredHoursAmount).toBeCloseTo(13.53, 2);
    expect(result.totalSalary).toBeCloseTo(705.41, 2);
  });

  it("reduces values when days are off", () => {
    const month = new Date(2026, 1, 1);
    // Take off Mon Feb 2 — breaks the week Feb 2-6
    const daysOff = new Set(["2026-02-02"]);
    const result = computeDeclaration(axelle, month, daysOff);

    expect(result.workedDays).toBe(19);
    // Only 3 full weeks now × 0.75 = 2.25h
    expect(result.majoredHoursCount).toBe(2.25);
    expect(result.maintenanceAllowance).toBe(76);
    expect(result.mealAllowance).toBe(76);
  });

  it("handles a month with zero worked days", () => {
    const month = new Date(2026, 1, 1);
    // Mark all business days off
    const daysOff = new Set<string>();
    for (let d = 1; d <= 28; d++) {
      const key = `2026-02-${String(d).padStart(2, "0")}`;
      daysOff.add(key);
    }
    const result = computeDeclaration(axelle, month, daysOff);

    expect(result.workedDays).toBe(0);
    expect(result.majoredHoursCount).toBe(0);
    expect(result.majoredHoursAmount).toBe(0);
    expect(result.totalSalary).toBeCloseTo(658.13, 2);
    expect(result.maintenanceAllowance).toBe(0);
    expect(result.mealAllowance).toBe(0);
  });

  describe("sick leave deduction", () => {
    it("computes deduction for 2 sick days in February 2026", () => {
      const month = new Date(2026, 1, 1);
      const daysOff = new Set<string>();
      // Feb 2 (Mon) = 9.25h, Feb 3 (Tue) = 9.25h → 18.5h sick leave
      const sickLeaveDays = new Set(["2026-02-02", "2026-02-03"]);
      const result = computeDeclaration(axelle, month, daysOff, sickLeaveDays);

      // Normal hours in Feb 2026 = 183h
      expect(result.normalHoursInMonth).toBe(183);
      // Hourly rate = 658.13 / 183
      expect(result.hourlyRate).toBeCloseTo(3.5963, 3);
      // Sick leave hours = 18.5
      expect(result.sickLeaveHours).toBe(18.5);
      // Deduction = 3.5963... × 18.5
      expect(result.sickLeaveDeduction).toBeCloseTo(66.53, 1);
      // Adjusted salary = 658.13 - 66.53
      expect(result.adjustedSalary).toBeCloseTo(591.60, 1);
      // Worked days = 20 - 2 = 18
      expect(result.workedDays).toBe(18);
      // Sick leave days count
      expect(result.sickLeaveDays).toBe(2);
      // Majored weeks: week Feb 2-6 is broken by sick leave → 3 full weeks
      expect(result.majoredHoursCount).toBe(2.25);
    });

    it("sick leave on Friday uses Friday rate", () => {
      const month = new Date(2026, 1, 1);
      const daysOff = new Set<string>();
      // Feb 6 is Friday = 8.75h
      const sickLeaveDays = new Set(["2026-02-06"]);
      const result = computeDeclaration(axelle, month, daysOff, sickLeaveDays);

      expect(result.sickLeaveHours).toBe(8.75);
      expect(result.sickLeaveDays).toBe(1);
    });

    it("totalSalary uses adjusted salary as base", () => {
      const month = new Date(2026, 1, 1);
      const daysOff = new Set<string>();
      // Sick on Feb 9 (Mon) — breaks week Feb 9-13
      const sickLeaveDays = new Set(["2026-02-09"]);
      const result = computeDeclaration(axelle, month, daysOff, sickLeaveDays);

      // totalSalary = adjustedSalary + majoredHoursAmount
      expect(result.totalSalary).toBeCloseTo(
        result.adjustedSalary + result.majoredHoursAmount,
        2
      );
      // And adjustedSalary < monthlySalary
      expect(result.adjustedSalary).toBeLessThan(result.monthlySalary);
    });
  });
});
