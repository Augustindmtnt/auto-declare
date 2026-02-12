import { ChildConfig, DeclarationResult } from "./types";
import {
  countMajoredWeeks,
  countWorkedDays,
  countNormalHoursInMonth,
  countSickLeaveHours,
} from "./calendar-utils";
import { MAINTENANCE_RATE, MEAL_RATE } from "./constants";

const MAJORED_HOURS_PER_WEEK = 0.75;

/**
 * Compute declaration values for one child for a given month.
 */
export function computeDeclaration(
  child: ChildConfig,
  displayedMonth: Date,
  daysOff: Set<string>,
  sickLeaveDays: Set<string> = new Set(),
  paidLeaveDays: Set<string> = new Set()
): DeclarationResult {
  // Paid leave has the same effect as days off on worked days and majored weeks
  const allDaysOff = new Set([...daysOff, ...paidLeaveDays]);

  const majoredWeeks = countMajoredWeeks(displayedMonth, allDaysOff, sickLeaveDays);
  const majoredHoursCount = majoredWeeks * MAJORED_HOURS_PER_WEEK;
  const majoredHoursAmount = majoredHoursCount * child.majoredHourRate;

  const normalHoursInMonth = countNormalHoursInMonth(displayedMonth);
  const hourlyRate = normalHoursInMonth > 0 ? child.monthlySalary / normalHoursInMonth : 0;
  const sickLeaveHours = countSickLeaveHours(displayedMonth, sickLeaveDays);
  const sickLeaveDeduction = hourlyRate * sickLeaveHours;
  const adjustedSalary = child.monthlySalary - sickLeaveDeduction;
  const totalSalary = adjustedSalary + majoredHoursAmount;

  const workedDays = countWorkedDays(displayedMonth, allDaysOff, sickLeaveDays);
  const maintenanceAllowance = workedDays * MAINTENANCE_RATE;
  const mealAllowance = workedDays * MEAL_RATE;

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
  };
}
