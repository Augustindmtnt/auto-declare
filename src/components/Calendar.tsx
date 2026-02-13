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

const PAINT_LABELS: Record<DayStateValue, { label: string; dot: string; bg: string }> = {
  worked: { label: "Travaillé", dot: "bg-blue-500", bg: "bg-blue-50 border-blue-200" },
  off: { label: "Absent", dot: "bg-gray-400", bg: "bg-gray-50 border-gray-200" },
  sick: { label: "Maladie / sans solde", dot: "bg-rose-500", bg: "bg-rose-50 border-rose-200" },
  paid_leave: { label: "Congés payés", dot: "bg-amber-500", bg: "bg-amber-50 border-amber-200" },
};

function buildPaintCursor(state: DayStateValue): string {
  const label = PAINT_LABELS[state].label;
  const svgWidth = Math.ceil(27 + label.length * 6 + 8);
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${svgWidth}' height='26' viewBox='0 0 ${svgWidth} 26'><g transform='rotate(-15 12 12)'><rect x='1' y='4' width='8' height='13' rx='1' fill='#fbbf24' stroke='#b45309' stroke-width='0.7'/><line x1='3.5' y1='5' x2='3.5' y2='16' stroke='#d97706' stroke-width='0.5'/><line x1='6.5' y1='5' x2='6.5' y2='16' stroke='#d97706' stroke-width='0.5'/><rect x='9' y='5.5' width='3' height='10' rx='0.3' fill='#9ca3af' stroke='#6b7280' stroke-width='0.5'/><rect x='12' y='7' width='10' height='7' rx='2' fill='#92400e'/></g><text x='27' y='16' font-family='system-ui,sans-serif' font-size='10' font-weight='600' fill='#374151'>${label}</text></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 1 13, crosshair`;
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
  const [paintState, setPaintState] = useState<DayStateValue | null>(null);
  const [isPainting, setIsPainting] = useState(false);
  const isPaintingRef = useRef(false);

  // Keep ref in sync so the document listener always sees the latest value
  isPaintingRef.current = isPainting;

  // End painting on mouseup anywhere; clear brush on Escape
  useEffect(() => {
    function handleMouseUp() {
      if (isPaintingRef.current) {
        setIsPainting(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setPaintState(null);
        setIsPainting(false);
      }
    }
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("keydown", handleKeyDown);
    };
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

  const paintCursor = useMemo(
    () => (paintState ? buildPaintCursor(paintState) : null),
    [paintState]
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

      {/* Paint brush indicator */}
      {paintState && (
        <div className={`flex items-center justify-center gap-2 px-3 py-1.5 border-b text-xs ${PAINT_LABELS[paintState].bg}`}>
          <span className={`w-2 h-2 rounded-full ${PAINT_LABELS[paintState].dot}`} />
          <span className="text-gray-600">
            Glisser pour appliquer : <span className="font-medium text-gray-900">{PAINT_LABELS[paintState].label}</span>
          </span>
          <button
            onClick={() => setPaintState(null)}
            className="ml-1 text-gray-400 hover:text-gray-600 cursor-pointer"
            title="Échap pour annuler"
          >
            ✕
          </button>
          <kbd className="ml-1 text-[10px] text-gray-400 bg-white/60 border border-gray-300 rounded px-1">Échap</kbd>
        </div>
      )}

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
              paintCursor={paintCursor}
            />
          ))
        )}
      </div>
    </div>
  );
}
