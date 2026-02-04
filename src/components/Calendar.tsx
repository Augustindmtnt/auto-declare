"use client";

import { CalendarWeek } from "@/lib/types";
import { DAY_LABELS } from "@/lib/constants";
import CalendarHeader from "./CalendarHeader";
import CalendarDay from "./CalendarDay";

interface CalendarProps {
  displayedMonth: Date;
  grid: CalendarWeek[];
  daysOff: Set<string>;
  onPrevious: () => void;
  onNext: () => void;
  onToggle: (dateKey: string) => void;
}

export default function Calendar({
  displayedMonth,
  grid,
  daysOff,
  onPrevious,
  onNext,
  onToggle,
}: CalendarProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <CalendarHeader
        displayedMonth={displayedMonth}
        onPrevious={onPrevious}
        onNext={onNext}
      />

      {/* Day labels */}
      <div className="grid grid-cols-7 mb-2">
        {DAY_LABELS.map((label) => (
          <div
            key={label}
            className="h-8 flex items-center justify-center text-xs font-medium text-gray-500 uppercase"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {grid.map((week, wi) =>
          week.days.map((day) => (
            <div key={day.dateKey} className="flex justify-center py-1.5">
              <CalendarDay
                day={day}
                isWorked={day.isBusinessDay && !daysOff.has(day.dateKey)}
                onToggle={onToggle}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
