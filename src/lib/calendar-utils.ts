import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isWeekend,
  isSameMonth,
  isToday,
  getISOWeek,
  getISOWeekYear,
} from "date-fns";
import { CalendarDay, CalendarWeek } from "./types";

/**
 * Build a calendar grid for the given month.
 * Includes partial weeks from adjacent months:
 * - Start-of-month overflow (previous month days): toggleable
 * - End-of-month overflow (next month days): NOT toggleable
 */
export function buildCalendarGrid(month: Date): CalendarWeek[] {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);

  // Weeks start on Monday (weekStartsOn: 1)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const allDays = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const weeks: CalendarWeek[] = [];
  for (let i = 0; i < allDays.length; i += 7) {
    const weekDays = allDays.slice(i, i + 7).map((date): CalendarDay => {
      const isCurrentMonth = isSameMonth(date, month);
      const isBefore = date < monthStart;
      return {
        date,
        dateKey: format(date, "yyyy-MM-dd"),
        isCurrentMonth,
        isBusinessDay: !isWeekend(date),
        isToday: isToday(date),
        // Previous month overflow days are toggleable; next month overflow days are not
        isToggleable: isCurrentMonth || isBefore,
      };
    });
    weeks.push({ days: weekDays });
  }

  return weeks;
}

/**
 * Get a unique week key from a date (ISO week year + week number).
 */
export function getWeekKey(date: Date): string {
  return `${getISOWeekYear(date)}-W${String(getISOWeek(date)).padStart(2, "0")}`;
}

/**
 * Determine which ISO weeks have all 5 business days worked,
 * and whether their majored hours count for the displayed month.
 *
 * Rules:
 * - A week qualifies if all Mon-Fri days are worked (not in daysOff, and are business days)
 * - If all 5 days are in the same month → counts for that month
 * - If the week spans two months → counts for the LATER month
 *
 * Returns the number of qualifying weeks whose majored hours
 * count for `displayedMonth`.
 */
export function countMajoredWeeks(
  displayedMonth: Date,
  daysOff: Set<string>
): number {
  const grid = buildCalendarGrid(displayedMonth);
  const displayedMonthIndex = displayedMonth.getMonth();
  const displayedYear = displayedMonth.getFullYear();

  // Collect all weeks with their business days
  const weekMap = new Map<string, CalendarDay[]>();
  for (const week of grid) {
    for (const day of week.days) {
      if (!day.isBusinessDay) continue;
      const wk = getWeekKey(day.date);
      if (!weekMap.has(wk)) weekMap.set(wk, []);
      weekMap.get(wk)!.push(day);
    }
  }

  let majoredCount = 0;

  for (const [, businessDays] of weekMap) {
    // A full work week needs exactly 5 business days
    if (businessDays.length !== 5) continue;

    // All must be worked (not in daysOff)
    const allWorked = businessDays.every((d) => !daysOff.has(d.dateKey));
    if (!allWorked) continue;

    // Determine which month this week's majored hours count for
    const months = new Set(
      businessDays.map((d) => `${d.date.getFullYear()}-${d.date.getMonth()}`)
    );

    if (months.size === 1) {
      // All in one month — counts for that month
      const day = businessDays[0];
      if (
        day.date.getMonth() === displayedMonthIndex &&
        day.date.getFullYear() === displayedYear
      ) {
        majoredCount++;
      }
    } else {
      // Spans two months — counts for the LATER month
      const latestDay = businessDays[businessDays.length - 1];
      if (
        latestDay.date.getMonth() === displayedMonthIndex &&
        latestDay.date.getFullYear() === displayedYear
      ) {
        majoredCount++;
      }
    }
  }

  return majoredCount;
}

/**
 * Count business days in the displayed month that are worked (not in daysOff).
 */
export function countWorkedDays(
  displayedMonth: Date,
  daysOff: Set<string>
): number {
  const monthStart = startOfMonth(displayedMonth);
  const monthEnd = endOfMonth(displayedMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  return days.filter((d) => !isWeekend(d) && !daysOff.has(format(d, "yyyy-MM-dd"))).length;
}

/**
 * Format a number in French style (comma as decimal separator).
 */
export function formatFrenchNumber(n: number, decimals: number = 2): string {
  return n.toFixed(decimals).replace(".", ",");
}

/**
 * Format a currency value in French style.
 */
export function formatEuro(n: number): string {
  return `${formatFrenchNumber(n)} €`;
}
