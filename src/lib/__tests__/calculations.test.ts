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
    // 658.13 + 12.87 = 671.00
    expect(result.totalSalary).toBeCloseTo(671.00, 2);
    // 20 × 4 = 80
    expect(result.maintenanceAllowance).toBe(80);
    expect(result.mealAllowance).toBe(80);
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
    expect(result.totalSalary).toBe(658.13);
    expect(result.maintenanceAllowance).toBe(0);
    expect(result.mealAllowance).toBe(0);
  });
});
