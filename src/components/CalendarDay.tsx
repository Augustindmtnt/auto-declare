"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { CalendarDay as CalendarDayType, GoogleCalendarEvent } from "@/lib/types";

type DayStateValue = "worked" | "off" | "sick" | "paid_leave";

interface CalendarDayProps {
  day: CalendarDayType;
  isWorked: boolean;
  isSickLeave: boolean;
  isPaidLeave: boolean;
  isBankHoliday: boolean;
  events: GoogleCalendarEvent[];
  onSetDayState: (dateKey: string, state: DayStateValue) => void;
  onPaintStart: (dateKey: string) => void;
  onPaintEnter: (dateKey: string) => void;
  paintCursor: string | null;
}

const STATE_OPTIONS: { value: DayStateValue; label: string; dot: string | null }[] = [
  { value: "worked", label: "Travaillé", dot: "bg-blue-500" },
  { value: "off", label: "Absent", dot: null },
  { value: "sick", label: "Maladie / sans solde", dot: "bg-rose-500" },
  { value: "paid_leave", label: "Congés payés", dot: "bg-amber-500" },
];

export default function CalendarDay({ day, isWorked, isSickLeave, isPaidLeave, isBankHoliday, events, onSetDayState, onPaintStart, onPaintEnter, paintCursor }: CalendarDayProps) {
  const [open, setOpen] = useState(false);
  const [openAbove, setOpenAbove] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const didDragRef = useRef(false);
  const didPaintRef = useRef(false);
  const dayNumber = day.date.getDate();

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    didDragRef.current = false;
    if (e.shiftKey) {
      didPaintRef.current = true;
      onPaintStart(day.dateKey);
    } else {
      didPaintRef.current = false;
    }
  }, [onPaintStart, day.dateKey]);

  const handleMouseMove = useCallback(() => {
    didDragRef.current = true;
  }, []);

  const handleMouseEnter = useCallback(() => {
    onPaintEnter(day.dateKey);
  }, [onPaintEnter, day.dateKey]);

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

  // Bank holidays — not toggleable
  if (isBankHoliday) {
    return (
      <div className="min-h-24 p-1 border-t border-gray-100 bg-gray-50/50 flex flex-col">
        <div className="text-center flex justify-center items-center gap-1">
          <span className={`text-xs font-medium ${day.isCurrentMonth ? "text-gray-400" : "text-gray-300"}`}>
            {dayNumber}
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
        </div>
        <EventList events={events} />
      </div>
    );
  }

  const currentState: DayStateValue = isSickLeave ? "sick" : isPaidLeave ? "paid_leave" : isWorked ? "worked" : "off";

  // Determine background based on state
  let bgClass: string;
  if (isSickLeave) {
    bgClass = day.isCurrentMonth
      ? "bg-rose-50 hover:bg-rose-100"
      : "bg-rose-50/50 hover:bg-rose-100/50";
  } else if (isPaidLeave) {
    bgClass = day.isCurrentMonth
      ? "bg-amber-50 hover:bg-amber-100"
      : "bg-amber-50/50 hover:bg-amber-100/50";
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
        className={`min-h-24 p-1 border-t border-gray-100 text-left w-full transition-colors flex flex-col ${paintCursor ? "" : "cursor-pointer"} ${bgClass}`}
        style={paintCursor ? { cursor: paintCursor } : undefined}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onClick={() => {
          if (didDragRef.current || didPaintRef.current) return;
          if (!open && ref.current) {
            const rect = ref.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            setOpenAbove(spaceBelow < 120);
          }
          setOpen((v) => !v);
        }}
      >
        <div className="text-center w-full flex justify-center items-center gap-1">
          <span className={`text-xs font-medium ${textClass}`}>
            {dayNumber}
          </span>
          {isSickLeave && (
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          )}
          {isPaidLeave && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          )}
          {isWorked && !isSickLeave && !isPaidLeave && (
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          )}
        </div>
        <EventList events={events} />
      </button>

      {open && (
        <div className={`absolute left-1/2 -translate-x-1/2 z-20 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[10rem] ${
          openAbove ? "bottom-full mb-1" : "top-full mt-1"
        }`}>
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
