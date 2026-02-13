import {
  format,
  addDays,
  startOfWeek,
} from "date-fns";

/**
 * Returns the reference period (June 1 – May 31) containing the given date.
 * - June–December → June of same year to May of next year
 * - January–May → June of previous year to May of same year
 */
export function getReferencePeriod(date: Date): { start: Date; end: Date } {
  const month = date.getMonth(); // 0-indexed
  const year = date.getFullYear();

  if (month >= 5) {
    // June (5) through December (11)
    return {
      start: new Date(year, 5, 1),
      end: new Date(year + 1, 4, 31),
    };
  } else {
    // January (0) through May (4)
    return {
      start: new Date(year - 1, 5, 1),
      end: new Date(year, 4, 31),
    };
  }
}

/**
 * Returns the reference period preceding the one containing the given date.
 */
export function getPreviousReferencePeriod(date: Date): { start: Date; end: Date } {
  const current = getReferencePeriod(date);
  // Go back one day from current start to land in previous period
  return getReferencePeriod(addDays(current.start, -1));
}

/**
 * Compute the number of worked weeks (prorated) in a period.
 *
 * Iterates each Monday in [periodStart, periodEnd], checks Mon–Fri.
 * A week belongs entirely to the period containing its Monday —
 * even if Tue–Fri fall in the next period, the full week is evaluated.
 *
 * Bank holidays and paid leave count as worked (paid days).
 * Only days off and sick leave reduce a week (workedDays / 5).
 */
export function computeWorkedWeeks(
  periodStart: Date,
  periodEnd: Date,
  daysOff: Set<string>,
  sickLeaveDays: Set<string>,
  paidLeaveDays: Set<string>
): number {
  // Find the first Monday on or after periodStart
  let monday = startOfWeek(periodStart, { weekStartsOn: 1 });
  if (monday < periodStart) {
    monday = addDays(monday, 7);
  }

  let totalWeeks = 0;

  while (monday <= periodEnd) {
    let workedDays = 0;

    // Always check the full Mon–Fri even if some days fall past periodEnd.
    // Bank holidays and paid leave count as worked (they are paid days).
    // Only days off and sick leave reduce the week.
    for (let i = 0; i < 5; i++) {
      const day = addDays(monday, i);
      const key = format(day, "yyyy-MM-dd");

      if (daysOff.has(key)) continue;
      if (sickLeaveDays.has(key)) continue;

      workedDays++;
    }

    totalWeeks += workedDays / 5;
    monday = addDays(monday, 7);
  }

  return totalWeeks;
}

/**
 * Compute acquired paid leave days from worked weeks.
 * Formula: ceil(workedWeeks / 4 * 2.5), capped at 30.
 */
export function computeAcquiredPaidLeave(workedWeeks: number): number {
  if (workedWeeks <= 0) return 0;
  return Math.min(Math.ceil((workedWeeks / 4) * 2.5), 30);
}

/**
 * Count the number of paid leave days taken within a period.
 */
export function countPaidLeaveTakenInPeriod(
  periodStart: Date,
  periodEnd: Date,
  paidLeaveDays: Set<string>
): number {
  const startKey = format(periodStart, "yyyy-MM-dd");
  const endKey = format(periodEnd, "yyyy-MM-dd");

  let count = 0;
  for (const key of paidLeaveDays) {
    if (key >= startKey && key <= endKey) {
      count++;
    }
  }
  return count;
}
