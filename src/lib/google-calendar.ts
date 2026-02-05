import { format, eachDayOfInterval, parseISO } from "date-fns";
import { GoogleCalendarEvent } from "./types";

export const DAYS_OFF_KEYWORDS = [
  "congé",
  "congés",
  "vacances",
  "absent",
  "absence",
  "repos",
  "férié",
  "pont",
  "maladie",
  "arrêt",
];

export function eventMatchesKeyword(eventSummary: string): boolean {
  const lowerSummary = eventSummary.toLowerCase();
  return DAYS_OFF_KEYWORDS.some((keyword) => lowerSummary.includes(keyword));
}

// Returns all dates (YYYY-MM-DD) that an event spans
export function getEventsForDate(event: GoogleCalendarEvent): string[] {
  const dates: string[] = [];

  const startDate = parseISO(event.start);
  const endDate = parseISO(event.end);

  // For multi-day events, extract all dates in the range
  // Note: Google Calendar all-day events have end date as exclusive
  const adjustedEndDate = new Date(endDate);
  adjustedEndDate.setDate(adjustedEndDate.getDate() - 1);

  if (adjustedEndDate >= startDate) {
    const daysInRange = eachDayOfInterval({
      start: startDate,
      end: adjustedEndDate,
    });

    for (const day of daysInRange) {
      dates.push(format(day, "yyyy-MM-dd"));
    }
  } else {
    // Single day event
    dates.push(format(startDate, "yyyy-MM-dd"));
  }

  return dates;
}

export function filterEventsForDaysOff(
  events: GoogleCalendarEvent[]
): string[] {
  const datesSet = new Set<string>();

  for (const event of events) {
    if (event.summary && eventMatchesKeyword(event.summary)) {
      const dates = getEventsForDate(event);
      for (const date of dates) {
        datesSet.add(date);
      }
    }
  }

  return Array.from(datesSet).sort();
}
