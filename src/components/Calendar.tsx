"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { format, startOfWeek } from "date-fns";
import { CalendarWeek, GoogleCalendarEvent, ChildConfig } from "@/lib/types";
import { DAY_LABELS } from "@/lib/constants";
import { getBankHolidays } from "@/lib/calendar-utils";
import { getEventsForDate } from "@/lib/google-calendar";
import CalendarHeader from "./CalendarHeader";
import CalendarDay, { ChildStateBadge } from "./CalendarDay";
import { ChildSets } from "@/hooks/useCalendarState";

// Deterministic per-child colors
const CHILD_COLORS = [
  "bg-indigo-500",
  "bg-violet-500",
  "bg-teal-500",
  "bg-orange-500",
];

const STATE_LABELS: Record<string, string> = {
  worked: "Travaillé",
  off: "Absent",
  sick: "Malade",
  paid_leave: "CP",
  contract_off: "Absent contrat",
};

interface CalendarProps {
  displayedMonth: Date;
  grid: CalendarWeek[];
  daysOff: Set<string>;
  sickLeaveDays: Set<string>;
  paidLeaveDays: Set<string>;
  paidLeaveSaturdayDays: Set<string>;
  contractOffDays: Set<string>;
  mixedDays: Set<string>;
  perChildSets: Map<string, ChildSets>;
  googleEvents: GoogleCalendarEvent[];
  paidLeaveAvailable: boolean;
  calendarMode: string;
  setCalendarMode: (mode: string) => void;
  children: ChildConfig[];
  onPrevious: () => void;
  onNext: () => void;
  onSetDayState: (dateKey: string, state: "worked" | "off" | "sick" | "paid_leave") => void;
  onToggleWeekContractOff: (mondayKey: string) => void;
}

type DayStateValue = "worked" | "off" | "sick" | "paid_leave" | "contract_off";

const PAINT_LABELS: Record<Exclude<DayStateValue, "contract_off">, string> = {
  worked: "Travaillé",
  off: "Absent",
  sick: "Maladie",
  paid_leave: "Congés payés",
};

function buildPaintCursor(state: Exclude<DayStateValue, "contract_off">): string {
  const label = PAINT_LABELS[state];
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
  paidLeaveSaturdayDays,
  contractOffDays,
  mixedDays,
  perChildSets,
  googleEvents,
  paidLeaveAvailable,
  calendarMode,
  setCalendarMode,
  children,
  onPrevious,
  onNext,
  onSetDayState,
  onToggleWeekContractOff,
}: CalendarProps) {
  const [paintState, setPaintState] = useState<DayStateValue | null>(null);
  const [isPainting, setIsPainting] = useState(false);
  const [shiftHeld, setShiftHeld] = useState(false);
  const isPaintingRef = useRef(false);
  isPaintingRef.current = isPainting;

  useEffect(() => {
    function handleMouseUp() {
      if (isPaintingRef.current) setIsPainting(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Shift") setShiftHeld(true);
    }
    function handleKeyUp(e: KeyboardEvent) {
      if (e.key === "Shift") setShiftHeld(false);
    }
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const handleSetDayState = useCallback(
    (dateKey: string, state: DayStateValue) => {
      if (state === "contract_off") return; // Only settable via week action
      onSetDayState(dateKey, state);
      setPaintState(state);
    },
    [onSetDayState]
  );

  const handlePaintStart = useCallback(
    (dateKey: string) => {
      if (paintState && paintState !== "contract_off") {
        onSetDayState(dateKey, paintState);
        setIsPainting(true);
      }
    },
    [paintState, onSetDayState]
  );

  const handlePaintEnter = useCallback(
    (dateKey: string) => {
      if (isPainting && paintState && paintState !== "contract_off") {
        onSetDayState(dateKey, paintState);
      }
    },
    [isPainting, paintState, onSetDayState]
  );

  const paintCursor = useMemo(
    () => (shiftHeld && paintState && paintState !== "contract_off" ? buildPaintCursor(paintState) : null),
    [shiftHeld, paintState]
  );

  const bankHolidays = useMemo(() => {
    const years = new Set<number>();
    for (const week of grid) {
      for (const day of week.days) years.add(day.date.getFullYear());
    }
    const holidays = new Set<string>();
    for (const y of years) {
      for (const h of getBankHolidays(y)) holidays.add(h);
    }
    return holidays;
  }, [grid]);

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

  // Per-day child state badges (only for mixed days)
  const childBadgesPerDay = useMemo<Map<string, ChildStateBadge[]>>(() => {
    const result = new Map<string, ChildStateBadge[]>();
    for (const key of mixedDays) {
      const badges: ChildStateBadge[] = children.map((child, idx) => {
        const sets = perChildSets.get(child.name);
        let state: string;
        if (sets?.sickLeaveDays.has(key)) state = "sick";
        else if (sets?.paidLeaveDays.has(key)) state = "paid_leave";
        else if (sets?.contractOffDays.has(key)) state = "contract_off";
        else if (sets?.daysOff.has(key)) state = "off";
        else state = "worked";
        return {
          name: child.name,
          initials: child.name.slice(0, 2),
          bgColorClass: CHILD_COLORS[idx % CHILD_COLORS.length],
          state,
          stateLabel: STATE_LABELS[state] ?? state,
        };
      });
      result.set(key, badges);
    }
    return result;
  }, [mixedDays, children, perChildSets]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <CalendarHeader
        displayedMonth={displayedMonth}
        onPrevious={onPrevious}
        onNext={onNext}
      />

      {/* Mode selector */}
      {children.length > 1 && (
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-gray-100">
          <button
            onClick={() => setCalendarMode("tous")}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
              calendarMode === "tous"
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Tous
          </button>
          {children.map((child, idx) => (
            <button
              key={child.name}
              onClick={() => setCalendarMode(child.name)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                calendarMode === child.name
                  ? `${CHILD_COLORS[idx % CHILD_COLORS.length]} text-white`
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {child.name.slice(0, 2)}
            </button>
          ))}
        </div>
      )}

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
        className={isPainting ? "select-none" : ""}
        onMouseLeave={() => setIsPainting(false)}
      >
        {grid.map((week) => {
          const monday = startOfWeek(week.days[0].date, { weekStartsOn: 1 });
          const mondayKey = format(monday, "yyyy-MM-dd");
          const isContractOffWeek = week.days
            .filter((d) => d.isBusinessDay)
            .every((d) => contractOffDays.has(d.dateKey));
          return (
            <div key={mondayKey} className="relative">
              <div className="grid grid-cols-7 divide-x divide-gray-100">
                {week.days.map((day) => {
                  const isMixed = mixedDays.has(day.dateKey);
                  return (
                    <CalendarDay
                      key={day.dateKey}
                      day={day}
                      isWorked={!isMixed && day.isBusinessDay && !daysOff.has(day.dateKey) && !sickLeaveDays.has(day.dateKey) && !paidLeaveDays.has(day.dateKey) && !contractOffDays.has(day.dateKey)}
                      isSickLeave={!isMixed && day.isBusinessDay && sickLeaveDays.has(day.dateKey)}
                      isPaidLeave={!isMixed && day.isBusinessDay && paidLeaveDays.has(day.dateKey)}
                      isAutoPaidLeave={!day.isBusinessDay && paidLeaveSaturdayDays.has(day.dateKey)}
                      isContractOff={!isMixed && day.isBusinessDay && contractOffDays.has(day.dateKey)}
                      isBankHoliday={bankHolidays.has(day.dateKey)}
                      isMixed={isMixed}
                      paidLeaveAvailable={paidLeaveAvailable}
                      childStateBadges={childBadgesPerDay.get(day.dateKey) ?? []}
                      events={eventsByDate.get(day.dateKey) || []}
                      onSetDayState={handleSetDayState}
                      onPaintStart={handlePaintStart}
                      onPaintEnter={handlePaintEnter}
                      paintCursor={paintCursor}
                    />
                  );
                })}
              </div>
              <WeekAction
                mondayKey={mondayKey}
                isContractOff={isContractOffWeek}
                onToggle={onToggleWeekContractOff}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekAction({
  mondayKey,
  isContractOff,
  onToggle,
}: {
  mondayKey: string;
  isContractOff: boolean;
  onToggle: (mondayKey: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  return (
    <div ref={ref} className="absolute right-1 top-1 z-10">
      <button
        className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] leading-none transition-colors cursor-pointer ${
          isContractOff
            ? "bg-purple-500 text-white hover:bg-purple-600"
            : "text-gray-400 hover:bg-gray-200 hover:text-gray-600"
        }`}
        onClick={() => setOpen((v) => !v)}
        title="Actions semaine"
      >
        {isContractOff ? "✓" : "+"}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[10rem]">
          <button
            className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-gray-50 transition-colors cursor-pointer ${
              isContractOff ? "font-semibold text-purple-700" : "text-gray-600"
            }`}
            onClick={() => {
              onToggle(mondayKey);
              setOpen(false);
            }}
          >
            <span className={`w-2 h-2 rounded-full ${isContractOff ? "bg-purple-500" : "border border-purple-400"}`} />
            {isContractOff ? "Retirer absence contrat" : "Absence contrat"}
          </button>
        </div>
      )}
    </div>
  );
}
