import { getMonth } from "date-fns";
import { ChildConfig, DeclarationResult } from "./types";
import {
  computeMajoredHours,
  countWorkedDays,
  countNormalHoursInMonth,
  countSickLeaveHours,
} from "./calendar-utils";
import {
  MAINTENANCE_RATE,
  MEAL_RATE,
  WEEKS_PER_YEAR,
  HOURS_PER_WEEK,
} from "./constants";

/**
 * Compute declaration values for one child for a given month.
 */
export function computeDeclaration(
  child: ChildConfig,
  displayedMonth: Date,
  daysOff: Set<string>,
  sickLeaveDays: Set<string> = new Set(),
  paidLeaveDays: Set<string> = new Set(),
  acquiredPaidLeaveDays: number = 0
): DeclarationResult {
  // Paid leave has the same effect as days off on worked days and majored weeks
  const allDaysOff = new Set([...daysOff, ...paidLeaveDays]);

  const majoredHoursCount = computeMajoredHours(displayedMonth, allDaysOff, sickLeaveDays);
  const majoredHoursAmount = majoredHoursCount * child.majoredHourRate;

  const normalHoursInMonth = countNormalHoursInMonth(displayedMonth);
  const hourlyRate = normalHoursInMonth > 0 ? child.monthlySalary / normalHoursInMonth : 0;
  const sickLeaveHours = countSickLeaveHours(displayedMonth, sickLeaveDays);
  const sickLeaveDeduction = hourlyRate * sickLeaveHours;
  const adjustedSalary = child.monthlySalary - sickLeaveDeduction;

  const workedDays = countWorkedDays(displayedMonth, allDaysOff, sickLeaveDays);
  const maintenanceAllowance = workedDays * MAINTENANCE_RATE;
  const mealAllowance = workedDays * MEAL_RATE;

  // Congés payés: paid in August, computed as max of two methods
  const isAugust = getMonth(displayedMonth) === 7;
  let congesPayes = 0;
  if (isAugust && acquiredPaidLeaveDays > 0) {
    // Méthode 1: 10% of annual net salary
    const method1 = child.monthlySalary * 12 * 0.1;
    // Méthode 2: maintien de salaire
    const netHourlyRate = (child.monthlySalary * 12) / (HOURS_PER_WEEK * WEEKS_PER_YEAR);
    const equivalentWeeks = acquiredPaidLeaveDays / 6;
    const method2 = equivalentWeeks * HOURS_PER_WEEK * netHourlyRate;
    congesPayes = Math.max(method1, method2);
  }

  const totalSalary = adjustedSalary + majoredHoursAmount + congesPayes;

  return {
    childName: child.name,
    monthlySalary: child.monthlySalary,
    majoredHoursCount,
    majoredHoursAmount,
    totalSalary,
    workedDays,
    maintenanceAllowance,
    mealAllowance,
    paidLeaveDays: paidLeaveDays.size,
    sickLeaveDays: sickLeaveDays.size,
    sickLeaveHours,
    sickLeaveDeduction,
    normalHoursInMonth,
    hourlyRate,
    adjustedSalary,
    congesPayes,
    congesPayesDaysAcquired: acquiredPaidLeaveDays,
  };
}
