"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
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

type DayStateValue = "worked" | "off" | "sick" | "paid_leave";

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
  const [paintState, setPaintState] = useState<DayStateValue | null>(null);
  const [isPainting, setIsPainting] = useState(false);
  const isPaintingRef = useRef(false);

  // Keep ref in sync so the document listener always sees the latest value
  isPaintingRef.current = isPainting;

  // End painting on mouseup anywhere in the document
  useEffect(() => {
    function handleMouseUp() {
      if (isPaintingRef.current) {
        setIsPainting(false);
      }
    }
    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, []);

  // Wrap onSetDayState to also set the paint brush
  const handleSetDayState = useCallback(
    (dateKey: string, state: DayStateValue) => {
      onSetDayState(dateKey, state);
      setPaintState(state);
    },
    [onSetDayState]
  );

  const handlePaintStart = useCallback(
    (dateKey: string) => {
      if (paintState) {
        onSetDayState(dateKey, paintState);
        setIsPainting(true);
      }
    },
    [paintState, onSetDayState]
  );

  const handlePaintEnter = useCallback(
    (dateKey: string) => {
      if (isPainting && paintState) {
        onSetDayState(dateKey, paintState);
      }
    },
    [isPainting, paintState, onSetDayState]
  );

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
      <div
        className={`grid grid-cols-7 divide-x divide-gray-100${isPainting ? " select-none" : ""}`}
        onMouseLeave={() => setIsPainting(false)}
      >
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
              onSetDayState={handleSetDayState}
              onPaintStart={handlePaintStart}
              onPaintEnter={handlePaintEnter}
            />
          ))
        )}
      </div>
    </div>
  );
}
