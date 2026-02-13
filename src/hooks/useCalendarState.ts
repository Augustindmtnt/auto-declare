"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { addMonths, subMonths, endOfMonth } from "date-fns";
import { buildCalendarGrid } from "@/lib/calendar-utils";
import { computeDeclaration } from "@/lib/calculations";
import {
  getReferencePeriod,
  getPreviousReferencePeriod,
  computeWorkedWeeks,
  computeAcquiredPaidLeave,
  countPaidLeaveTakenInPeriod,
} from "@/lib/paid-leave";
import { CHILDREN } from "@/lib/constants";
import { CalendarWeek, DeclarationResult, GoogleCalendarEvent } from "@/lib/types";
import type { PaidLeaveCounters } from "@/components/PaidLeavePanel";

type DayState = "off" | "sick" | "paid_leave";

export function useCalendarState() {
  const [displayedMonth, setDisplayedMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const [dayStates, setDayStates] = useState<Map<string, DayState>>(() => new Map());
  const [isHydrated, setIsHydrated] = useState(false);
  const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>([]);

  // Derive daysOff and sickLeaveDays from combined state
  const daysOff = useMemo(
    () => new Set([...dayStates].filter(([, s]) => s === "off").map(([k]) => k)),
    [dayStates]
  );
  const sickLeaveDays = useMemo(
    () => new Set([...dayStates].filter(([, s]) => s === "sick").map(([k]) => k)),
    [dayStates]
  );
  const paidLeaveDays = useMemo(
    () => new Set([...dayStates].filter(([, s]) => s === "paid_leave").map(([k]) => k)),
    [dayStates]
  );

  // Load from localStorage after hydration (supports both old and new format)
  useEffect(() => {
    const map = new Map<string, DayState>();

    const savedDaysOff = localStorage.getItem("daysOff");
    if (savedDaysOff) {
      for (const key of JSON.parse(savedDaysOff)) {
        map.set(key, "off");
      }
    }
    const savedSickLeave = localStorage.getItem("sickLeaveDays");
    if (savedSickLeave) {
      for (const key of JSON.parse(savedSickLeave)) {
        map.set(key, "sick");
      }
    }
    const savedPaidLeave = localStorage.getItem("paidLeaveDays");
    if (savedPaidLeave) {
      for (const key of JSON.parse(savedPaidLeave)) {
        map.set(key, "paid_leave");
      }
    }

    if (map.size > 0) setDayStates(map);
    setIsHydrated(true);
  }, []);

  // Persist to localStorage (as separate keys for backward compat)
  useEffect(() => {
    if (isHydrated) {
      const off: string[] = [];
      const sick: string[] = [];
      const paid: string[] = [];
      for (const [key, state] of dayStates) {
        if (state === "off") off.push(key);
        else if (state === "sick") sick.push(key);
        else if (state === "paid_leave") paid.push(key);
      }
      localStorage.setItem("daysOff", JSON.stringify(off));
      localStorage.setItem("sickLeaveDays", JSON.stringify(sick));
      localStorage.setItem("paidLeaveDays", JSON.stringify(paid));
    }
  }, [dayStates, isHydrated]);

  const goToPreviousMonth = useCallback(() => {
    setDisplayedMonth((m) => subMonths(m, 1));
  }, []);

  const goToNextMonth = useCallback(() => {
    setDisplayedMonth((m) => addMonths(m, 1));
  }, []);

  const setDayState = useCallback((dateKey: string, state: "worked" | "off" | "sick" | "paid_leave") => {
    setDayStates((prev) => {
      const next = new Map(prev);
      if (state === "worked") {
        next.delete(dateKey);
      } else {
        next.set(dateKey, state);
      }
      return next;
    });
  }, []);

  const syncFromGoogle = useCallback((events: GoogleCalendarEvent[]) => {
    setGoogleEvents(events);
  }, []);

  const clearGoogleEvents = useCallback(() => {
    setGoogleEvents([]);
  }, []);

  const grid: CalendarWeek[] = useMemo(
    () => buildCalendarGrid(displayedMonth),
    [displayedMonth]
  );

  const results: DeclarationResult[] = useMemo(
    () =>
      CHILDREN.map((child) =>
        computeDeclaration(child, displayedMonth, daysOff, sickLeaveDays, paidLeaveDays)
      ),
    [displayedMonth, daysOff, sickLeaveDays, paidLeaveDays]
  );

  const paidLeaveCounters: PaidLeaveCounters = useMemo(() => {
    const monthEnd = endOfMonth(displayedMonth);
    const currentPeriod = getReferencePeriod(displayedMonth);
    const previousPeriod = getPreviousReferencePeriod(displayedMonth);

    // Acquired during previous period
    const workedWeeksPrev = computeWorkedWeeks(
      previousPeriod.start, previousPeriod.end, daysOff, sickLeaveDays, paidLeaveDays
    );
    const acquiredPrevious = computeAcquiredPaidLeave(workedWeeksPrev);

    // Paid leave taken in the current period
    const takenInCurrent = countPaidLeaveTakenInPeriod(
      currentPeriod.start, currentPeriod.end, paidLeaveDays
    );

    // Available = acquired previous - taken in current
    const available = Math.max(0, acquiredPrevious - takenInCurrent);

    // Acquiring: worked weeks in current period up to end of displayed month
    const acquiringEnd = monthEnd < currentPeriod.end ? monthEnd : currentPeriod.end;
    const workedWeeksCurrent = computeWorkedWeeks(
      currentPeriod.start, acquiringEnd, daysOff, sickLeaveDays, paidLeaveDays
    );
    const acquiring = computeAcquiredPaidLeave(workedWeeksCurrent);

    return {
      acquiredPrevious,
      takenInCurrent,
      available,
      acquiring,
      currentPeriodStart: currentPeriod.start,
      currentPeriodEnd: currentPeriod.end,
      previousPeriodStart: previousPeriod.start,
      previousPeriodEnd: previousPeriod.end,
    };
  }, [displayedMonth, daysOff, sickLeaveDays, paidLeaveDays]);

  return {
    displayedMonth,
    daysOff,
    sickLeaveDays,
    paidLeaveDays,
    googleEvents,
    grid,
    results,
    goToPreviousMonth,
    goToNextMonth,
    setDayState,
    syncFromGoogle,
    clearGoogleEvents,
    paidLeaveCounters,
  };
}
