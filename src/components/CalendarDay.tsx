"use client";

import { useState, useRef, useEffect } from "react";
import { CalendarDay as CalendarDayType, GoogleCalendarEvent } from "@/lib/types";

type DayStateValue = "worked" | "off" | "sick";

interface CalendarDayProps {
  day: CalendarDayType;
  isWorked: boolean;
  isSickLeave: boolean;
  events: GoogleCalendarEvent[];
  onSetDayState: (dateKey: string, state: DayStateValue) => void;
}

const STATE_OPTIONS: { value: DayStateValue; label: string; dot: string | null }[] = [
  { value: "worked", label: "Travaillé", dot: "bg-blue-500" },
  { value: "off", label: "Absent", dot: null },
  { value: "sick", label: "Maladie / sans solde", dot: "bg-rose-500" },
];

export default function CalendarDay({ day, isWorked, isSickLeave, events, onSetDayState }: CalendarDayProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const dayNumber = day.date.getDate();

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Weekend cells
  if (!day.isBusinessDay) {
    return (
      <div className="min-h-24 p-1 border-t border-gray-100 bg-gray-50/50 flex flex-col">
        <div className="text-center">
          <span className="text-xs text-gray-400">{dayNumber}</span>
        </div>
        <EventList events={events} />
      </div>
    );
  }

  // Not toggleable (end-of-month overflow from next month)
  if (!day.isToggleable) {
    return (
      <div className="min-h-24 p-1 border-t border-gray-100 bg-gray-50/30 flex flex-col">
        <div className="text-center">
          <span className="text-xs text-gray-300">{dayNumber}</span>
        </div>
        <EventList events={events} />
      </div>
    );
  }

  const currentState: DayStateValue = isSickLeave ? "sick" : isWorked ? "worked" : "off";

  // Determine background based on state
  let bgClass: string;
  if (isSickLeave) {
    bgClass = day.isCurrentMonth
      ? "bg-rose-50 hover:bg-rose-100"
      : "bg-rose-50/50 hover:bg-rose-100/50";
  } else if (isWorked) {
    bgClass = day.isCurrentMonth
      ? "bg-blue-50 hover:bg-blue-100"
      : "bg-blue-50/50 hover:bg-blue-100/50";
  } else {
    bgClass = day.isCurrentMonth
      ? "bg-white hover:bg-gray-50"
      : "bg-gray-50/30 hover:bg-gray-100/50";
  }

  const textClass = day.isCurrentMonth ? "text-gray-900" : "text-gray-400";

  return (
    <div ref={ref} className="relative">
      <button
        className={`min-h-24 p-1 border-t border-gray-100 text-left w-full transition-colors flex flex-col cursor-pointer ${bgClass}`}
        onClick={() => setOpen((v) => !v)}
      >
        <div className="text-center w-full flex justify-center items-center gap-1">
          <span className={`text-xs font-medium ${textClass}`}>
            {dayNumber}
          </span>
          {isSickLeave && (
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          )}
          {isWorked && !isSickLeave && (
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          )}
        </div>
        <EventList events={events} />
      </button>

      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 z-20 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[10rem]">
          {STATE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-gray-50 transition-colors cursor-pointer ${
                currentState === opt.value ? "font-semibold text-gray-900" : "text-gray-600"
              }`}
              onClick={() => {
                onSetDayState(day.dateKey, opt.value);
                setOpen(false);
              }}
            >
              {opt.dot ? (
                <span className={`w-2 h-2 rounded-full ${opt.dot}`} />
              ) : (
                <span className="w-2 h-2 rounded-full border border-gray-300" />
              )}
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
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
