"use client";

import { CalendarDay as CalendarDayType } from "@/lib/types";

interface CalendarDayProps {
  day: CalendarDayType;
  isWorked: boolean;
  onToggle: (dateKey: string) => void;
}

export default function CalendarDay({ day, isWorked, onToggle }: CalendarDayProps) {
  // Weekend cells: show date but disabled
  if (!day.isBusinessDay) {
    return (
      <div className="w-10 h-10 flex items-center justify-center text-sm text-gray-300">
        {day.date.getDate()}
      </div>
    );
  }

  const dayNumber = day.date.getDate();

  // Not toggleable (end-of-month overflow from next month)
  if (!day.isToggleable) {
    return (
      <div className="w-10 h-10 flex items-center justify-center text-sm text-gray-300">
        {dayNumber}
      </div>
    );
  }

  // Determine styles
  let baseClasses =
    "w-10 h-10 flex items-center justify-center text-sm rounded-full cursor-pointer select-none transition-all duration-150";

  if (isWorked) {
    if (day.isCurrentMonth) {
      baseClasses += " bg-blue-500 text-white hover:bg-blue-600";
    } else {
      // Previous month overflow — worked but greyed
      baseClasses += " bg-blue-300 text-white hover:bg-blue-400";
    }
  } else {
    if (day.isCurrentMonth) {
      baseClasses += " text-gray-700 hover:bg-gray-100";
    } else {
      baseClasses += " text-gray-400 hover:bg-gray-50";
    }
  }

  // Today ring
  if (day.isToday) {
    baseClasses += " ring-2 ring-blue-300 ring-offset-1";
  }

  return (
    <button
      className={baseClasses}
      onClick={() => onToggle(day.dateKey)}
      aria-label={`${dayNumber} ${isWorked ? "(travaillé)" : "(non travaillé)"}`}
    >
      {dayNumber}
    </button>
  );
}
