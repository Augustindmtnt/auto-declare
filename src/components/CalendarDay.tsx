"use client";

import { CalendarDay as CalendarDayType, GoogleCalendarEvent } from "@/lib/types";

interface CalendarDayProps {
  day: CalendarDayType;
  isWorked: boolean;
  events: GoogleCalendarEvent[];
  onToggle: (dateKey: string) => void;
}

export default function CalendarDay({ day, isWorked, events, onToggle }: CalendarDayProps) {
  const dayNumber = day.date.getDate();

  // Weekend cells
  if (!day.isBusinessDay) {
    return (
      <div className="min-h-24 p-1 border-t border-gray-100 bg-gray-50/50">
        <div className="flex justify-center">
          <span className="text-xs text-gray-400">{dayNumber}</span>
        </div>
        <EventList events={events} />
      </div>
    );
  }

  // Not toggleable (end-of-month overflow from next month)
  if (!day.isToggleable) {
    return (
      <div className="min-h-24 p-1 border-t border-gray-100 bg-gray-50/30">
        <div className="flex justify-center">
          <span className="text-xs text-gray-300">{dayNumber}</span>
        </div>
        <EventList events={events} />
      </div>
    );
  }

  // Determine background based on worked status
  const bgClass = isWorked
    ? day.isCurrentMonth
      ? "bg-blue-50 hover:bg-blue-100"
      : "bg-blue-50/50 hover:bg-blue-100/50"
    : day.isCurrentMonth
      ? "bg-white hover:bg-gray-50"
      : "bg-gray-50/30 hover:bg-gray-100/50";

  const textClass = day.isCurrentMonth ? "text-gray-900" : "text-gray-400";

  return (
    <button
      className={`min-h-24 p-1 border-t border-gray-100 text-left w-full transition-colors ${bgClass}`}
      onClick={() => onToggle(day.dateKey)}
    >
      <div className="flex justify-center items-center gap-1">
        <span className={`text-xs font-medium ${textClass}`}>
          {dayNumber}
        </span>
        {isWorked && (
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
        )}
      </div>
      <EventList events={events} />
    </button>
  );
}

function EventList({ events }: { events: GoogleCalendarEvent[] }) {
  if (events.length === 0) return null;

  return (
    <div className="mt-1 space-y-0.5 overflow-hidden">
      {events.slice(0, 3).map((event) => (
        <div
          key={event.id}
          className="text-[10px] leading-tight px-1 py-0.5 rounded bg-orange-100 text-orange-800 truncate"
        >
          {event.summary}
        </div>
      ))}
      {events.length > 3 && (
        <div className="text-[10px] text-gray-500 px-1">
          +{events.length - 3} autres
        </div>
      )}
    </div>
  );
}
