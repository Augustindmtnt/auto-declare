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
  getDay,
} from "date-fns";
import { CalendarDay, CalendarWeek } from "./types";
import { HOURS_MON_THU, HOURS_FRI } from "./constants";

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
 * Compute Easter Sunday for a given year using the Meeus/Jones/Butcher algorithm.
 */
export function computeEasterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

/**
 * Get all French bank holidays (jours fériés) for a given year as "YYYY-MM-DD" strings.
 */
export function getBankHolidays(year: number): Set<string> {
  const holidays: Date[] = [
    new Date(year, 0, 1),   // Jour de l'an
    new Date(year, 4, 1),   // Fête du travail
    new Date(year, 4, 8),   // Victoire 1945
    new Date(year, 6, 14),  // Fête nationale
    new Date(year, 7, 15),  // Assomption
    new Date(year, 10, 1),  // Toussaint
    new Date(year, 10, 11), // Armistice
    new Date(year, 11, 25), // Noël
  ];

  const easter = computeEasterDate(year);
  // Lundi de Pâques (Easter Monday)
  holidays.push(new Date(easter.getFullYear(), easter.getMonth(), easter.getDate() + 1));
  // Ascension (Easter + 39 days)
  holidays.push(new Date(easter.getFullYear(), easter.getMonth(), easter.getDate() + 39));
  // Lundi de Pentecôte (Easter + 50 days)
  holidays.push(new Date(easter.getFullYear(), easter.getMonth(), easter.getDate() + 50));

  return new Set(holidays.map((d) => format(d, "yyyy-MM-dd")));
}

/**
 * Get the number of work hours for a given day.
 * Mon-Thu: 9.25h, Fri: 8.75h, Weekend: 0h
 */
export function getHoursForDay(date: Date): number {
  const dow = getDay(date); // 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat
  if (dow === 0 || dow === 6) return 0;
  if (dow === 5) return HOURS_FRI;
  return HOURS_MON_THU;
}

/**
 * Count the normal (expected) work hours in a month,
 * excluding weekends and bank holidays.
 */
export function countNormalHoursInMonth(month: Date): number {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const holidays = getBankHolidays(month.getFullYear());

  let total = 0;
  for (const d of days) {
    if (isWeekend(d)) continue;
    if (holidays.has(format(d, "yyyy-MM-dd"))) continue;
    total += getHoursForDay(d);
  }
  return total;
}

/**
 * Count the total hours of sick leave days in a month.
 */
export function countSickLeaveHours(month: Date, sickLeaveDays: Set<string>): number {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  let total = 0;
  for (const d of days) {
    const key = format(d, "yyyy-MM-dd");
    if (sickLeaveDays.has(key)) {
      total += getHoursForDay(d);
    }
  }
  return total;
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
  daysOff: Set<string>,
  sickLeaveDays: Set<string> = new Set()
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

    // All must be worked (not in daysOff or sickLeaveDays)
    const allWorked = businessDays.every(
      (d) => !daysOff.has(d.dateKey) && !sickLeaveDays.has(d.dateKey)
    );
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
  daysOff: Set<string>,
  sickLeaveDays: Set<string> = new Set()
): number {
  const monthStart = startOfMonth(displayedMonth);
  const monthEnd = endOfMonth(displayedMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  return days.filter((d) => {
    const key = format(d, "yyyy-MM-dd");
    return !isWeekend(d) && !daysOff.has(key) && !sickLeaveDays.has(key);
  }).length;
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
