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
  paidLeaveDays: Set<string>,
  contractOffDays: Set<string> = new Set()
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
      if (contractOffDays.has(key)) continue;

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
 * Compute which Saturdays automatically count as paid leave ("jours ouvrables").
 *
 * In French labour law, paid leave is counted in "jours ouvrables" (Mon–Sat,
 * excluding Sundays and bank holidays). So when a Friday is taken as paid leave,
 * the following Saturday is also consumed from the balance — UNLESS:
 *   - The Saturday is a bank holiday, or
 *   - There is only 1 paid leave day remaining in the balance before Friday
 *     (i.e. the balance would not cover both Friday and Saturday).
 *
 * Days are processed in chronological order within the reference period,
 * tracking the running balance.
 */
export function computePaidLeaveSaturdayDays(
  paidLeaveDays: Set<string>,
  bankHolidays: Set<string>,
  acquiredPrevious: number,
  periodStart: Date,
  periodEnd: Date
): Set<string> {
  const startKey = format(periodStart, "yyyy-MM-dd");
  const endKey = format(periodEnd, "yyyy-MM-dd");

  const periodDays = [...paidLeaveDays]
    .filter((k) => k >= startKey && k <= endKey)
    .sort();

  let remaining = acquiredPrevious;
  const saturdays = new Set<string>();

  for (const key of periodDays) {
    const [y, m, d] = key.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    const dow = date.getDay(); // 0=Sun … 5=Fri … 6=Sat

    // Consume this paid leave day from the running balance
    remaining = Math.max(0, remaining - 1);

    if (dow === 5) { // Friday
      const satDate = addDays(date, 1);
      const satKey = format(satDate, "yyyy-MM-dd");
      // Saturday counts only if not a bank holiday AND balance still >= 1
      // (i.e. before Friday the balance was >= 2)
      if (!bankHolidays.has(satKey) && remaining >= 1) {
        saturdays.add(satKey);
        remaining = Math.max(0, remaining - 1);
      }
    }
  }

  return saturdays;
}

/**
 * Count the number of paid leave days taken within a period,
 * including automatically-counted Saturdays (jours ouvrables).
 */
export function countPaidLeaveTakenInPeriod(
  periodStart: Date,
  periodEnd: Date,
  paidLeaveDays: Set<string>,
  autoSaturdayDays: Set<string> = new Set()
): number {
  const startKey = format(periodStart, "yyyy-MM-dd");
  const endKey = format(periodEnd, "yyyy-MM-dd");

  let count = 0;
  for (const key of paidLeaveDays) {
    if (key >= startKey && key <= endKey) {
      count++;
    }
  }
  // autoSaturdayDays are already scoped to the period by computePaidLeaveSaturdayDays;
  // count them all (even the rare Saturday that spills one day past periodEnd).
  count += autoSaturdayDays.size;
  return count;
}
