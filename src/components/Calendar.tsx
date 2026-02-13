"use client";

import { useMemo } from "react";
import { CalendarWeek, GoogleCalendarEvent } from "@/lib/types";
import { DAY_LABELS } from "@/lib/constants";
import { getBankHolidays } from "@/lib/calendar-utils";
import { getEventsForDate } from "@/lib/google-calendar";
import CalendarHeader from "./CalendarHeader";
import CalendarDay from "./CalendarDay";

interface CalendarProps {
  displayedMonth: Date;
  grid: CalendarWeek[];
  daysOff: Set<string>;
  sickLeaveDays: Set<string>;
  paidLeaveDays: Set<string>;
  googleEvents: GoogleCalendarEvent[];
  onPrevious: () => void;
  onNext: () => void;
  onSetDayState: (dateKey: string, state: "worked" | "off" | "sick" | "paid_leave") => void;
}

export default function Calendar({
  displayedMonth,
  grid,
  daysOff,
  sickLeaveDays,
  paidLeaveDays,
  googleEvents,
  onPrevious,
  onNext,
  onSetDayState,
}: CalendarProps) {
  // Collect bank holidays for all years visible in the grid
  const bankHolidays = useMemo(() => {
    const years = new Set<number>();
    for (const week of grid) {
      for (const day of week.days) {
        years.add(day.date.getFullYear());
      }
    }
    const holidays = new Set<string>();
    for (const y of years) {
      for (const h of getBankHolidays(y)) {
        holidays.add(h);
      }
    }
    return holidays;
  }, [grid]);

  // Build a map of dateKey -> events for efficient lookup
  const eventsByDate = useMemo(() => {
    const map = new Map<string, GoogleCalendarEvent[]>();
    for (const event of googleEvents) {
      const dates = getEventsForDate(event);
      for (const date of dates) {
        const existing = map.get(date) || [];
        existing.push(event);
        map.set(date, existing);
      }
    }
    return map;
  }, [googleEvents]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <CalendarHeader
        displayedMonth={displayedMonth}
        onPrevious={onPrevious}
        onNext={onNext}
      />

      {/* Day labels */}
      <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
        {DAY_LABELS.map((label) => (
          <div
            key={label}
            className="py-2 text-center text-xs font-medium text-gray-500 uppercase"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 divide-x divide-gray-100">
        {grid.map((week) =>
          week.days.map((day) => (
            <CalendarDay
              key={day.dateKey}
              day={day}
              isWorked={day.isBusinessDay && !daysOff.has(day.dateKey) && !sickLeaveDays.has(day.dateKey) && !paidLeaveDays.has(day.dateKey)}
              isSickLeave={day.isBusinessDay && sickLeaveDays.has(day.dateKey)}
              isPaidLeave={day.isBusinessDay && paidLeaveDays.has(day.dateKey)}
              isBankHoliday={bankHolidays.has(day.dateKey)}
              events={eventsByDate.get(day.dateKey) || []}
              onSetDayState={onSetDayState}
            />
          ))
        )}
      </div>
    </div>
  );
}
