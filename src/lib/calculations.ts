import { ChildConfig, DeclarationResult } from "./types";
import { countMajoredWeeks, countWorkedDays } from "./calendar-utils";
import { MAINTENANCE_RATE, MEAL_RATE } from "./constants";

const MAJORED_HOURS_PER_WEEK = 0.75;

/**
 * Compute declaration values for one child for a given month.
 */
export function computeDeclaration(
  child: ChildConfig,
  displayedMonth: Date,
  daysOff: Set<string>
): DeclarationResult {
  const majoredWeeks = countMajoredWeeks(displayedMonth, daysOff);
  const majoredHoursCount = majoredWeeks * MAJORED_HOURS_PER_WEEK;
  const majoredHoursAmount = majoredHoursCount * child.majoredHourRate;
  const totalSalary = child.monthlySalary + majoredHoursAmount;

  const workedDays = countWorkedDays(displayedMonth, daysOff);
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
  };
}
