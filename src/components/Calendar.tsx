"use client";

import { useMemo } from "react";
import { CalendarWeek, GoogleCalendarEvent } from "@/lib/types";
import { DAY_LABELS } from "@/lib/constants";
import { getEventsForDate } from "@/lib/google-calendar";
import CalendarHeader from "./CalendarHeader";
import CalendarDay from "./CalendarDay";

interface CalendarProps {
  displayedMonth: Date;
  grid: CalendarWeek[];
  daysOff: Set<string>;
  googleEvents: GoogleCalendarEvent[];
  onPrevious: () => void;
  onNext: () => void;
  onToggle: (dateKey: string) => void;
}

export default function Calendar({
  displayedMonth,
  grid,
  daysOff,
  googleEvents,
  onPrevious,
  onNext,
  onToggle,
}: CalendarProps) {
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
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
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
              isWorked={day.isBusinessDay && !daysOff.has(day.dateKey)}
              events={eventsByDate.get(day.dateKey) || []}
              onToggle={onToggle}
            />
          ))
        )}
      </div>
    </div>
  );
}
