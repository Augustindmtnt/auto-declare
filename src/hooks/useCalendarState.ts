"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { addMonths, subMonths, endOfMonth, startOfWeek, addDays, format } from "date-fns";
import { buildCalendarGrid, getBankHolidays } from "@/lib/calendar-utils";
import { computeDeclaration } from "@/lib/calculations";
import {
  getReferencePeriod,
  getPreviousReferencePeriod,
  computeWorkedWeeks,
  computeAcquiredPaidLeave,
  countPaidLeaveTakenInPeriod,
  computePaidLeaveSaturdayDays,
} from "@/lib/paid-leave";
import { computeMonthlySalary } from "@/lib/constants";
import { CalendarWeek, DeclarationResult, GoogleCalendarEvent } from "@/lib/types";
import { useContracts } from "./useContracts";

type DayState = "off" | "sick" | "paid_leave" | "contract_off";

export function useCalendarState() {
  const { children } = useContracts();
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
  const contractOffDays = useMemo(
    () => new Set([...dayStates].filter(([, s]) => s === "contract_off").map(([k]) => k)),
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
    const savedContractOff = localStorage.getItem("contractOffDays");
    if (savedContractOff) {
      for (const key of JSON.parse(savedContractOff)) {
        map.set(key, "contract_off");
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
      const contractOff: string[] = [];
      for (const [key, state] of dayStates) {
        if (state === "off") off.push(key);
        else if (state === "sick") sick.push(key);
        else if (state === "paid_leave") paid.push(key);
        else if (state === "contract_off") contractOff.push(key);
      }
      localStorage.setItem("daysOff", JSON.stringify(off));
      localStorage.setItem("sickLeaveDays", JSON.stringify(sick));
      localStorage.setItem("paidLeaveDays", JSON.stringify(paid));
      localStorage.setItem("contractOffDays", JSON.stringify(contractOff));
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

  /** Toggle an entire Mon-Fri week as contract_off. */
  const toggleWeekContractOff = useCallback((mondayKey: string) => {
    setDayStates((prev) => {
      const next = new Map(prev);
      const monday = new Date(mondayKey);
      const keys: string[] = [];
      for (let i = 0; i < 5; i++) {
        keys.push(format(addDays(monday, i), "yyyy-MM-dd"));
      }
      const isAlreadyOff = keys.every((k) => prev.get(k) === "contract_off");
      for (const k of keys) {
        if (isAlreadyOff) {
          next.delete(k);
        } else {
          next.set(k, "contract_off");
        }
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

  const { paidLeaveCounters, paidLeaveSaturdayDays } = useMemo(() => {
    const monthEnd = endOfMonth(displayedMonth);
    const currentPeriod = getReferencePeriod(displayedMonth);
    const previousPeriod = getPreviousReferencePeriod(displayedMonth);

    // Acquired during previous period
    const workedWeeksPrev = computeWorkedWeeks(
      previousPeriod.start, previousPeriod.end, daysOff, sickLeaveDays, paidLeaveDays, contractOffDays
    );
    const acquiredPrevious = computeAcquiredPaidLeave(workedWeeksPrev);

    // Bank holidays for the current reference period (spans two calendar years)
    const bankHolidays = new Set<string>();
    for (const year of [currentPeriod.start.getFullYear(), currentPeriod.end.getFullYear()]) {
      for (const h of getBankHolidays(year)) bankHolidays.add(h);
    }

    // Saturdays that automatically count as paid leave (jours ouvrables)
    const paidLeaveSaturdayDays = computePaidLeaveSaturdayDays(
      paidLeaveDays, bankHolidays, acquiredPrevious, currentPeriod.start, currentPeriod.end
    );

    // Paid leave taken in the current period (manual days + auto-Saturdays)
    const takenInCurrent = countPaidLeaveTakenInPeriod(
      currentPeriod.start, currentPeriod.end, paidLeaveDays, paidLeaveSaturdayDays
    );

    // Available = acquired previous - taken in current
    const available = Math.max(0, acquiredPrevious - takenInCurrent);

    // Acquiring: worked weeks in current period up to end of displayed month
    const acquiringEnd = monthEnd < currentPeriod.end ? monthEnd : currentPeriod.end;
    const workedWeeksCurrent = computeWorkedWeeks(
      currentPeriod.start, acquiringEnd, daysOff, sickLeaveDays, paidLeaveDays, contractOffDays
    );
    const acquiring = computeAcquiredPaidLeave(workedWeeksCurrent);

    return {
      paidLeaveCounters: {
        acquiredPrevious,
        takenInCurrent,
        available,
        acquiring,
        currentPeriodStart: currentPeriod.start,
        currentPeriodEnd: currentPeriod.end,
        previousPeriodStart: previousPeriod.start,
        previousPeriodEnd: previousPeriod.end,
      },
      paidLeaveSaturdayDays,
    };
  }, [displayedMonth, daysOff, sickLeaveDays, paidLeaveDays, contractOffDays]);

  const results: DeclarationResult[] = useMemo(
    () =>
      children.map((child) => {
        const monthlySalary = computeMonthlySalary(child.netHourlyRate);
        return computeDeclaration(
          child, monthlySalary, displayedMonth, daysOff, sickLeaveDays, paidLeaveDays,
          contractOffDays, paidLeaveCounters.acquiredPrevious
        );
      }),
    [children, displayedMonth, daysOff, sickLeaveDays, paidLeaveDays, contractOffDays, paidLeaveCounters.acquiredPrevious]
  );

  return {
    displayedMonth,
    daysOff,
    sickLeaveDays,
    paidLeaveDays,
    paidLeaveSaturdayDays,
    contractOffDays,
    googleEvents,
    grid,
    results,
    goToPreviousMonth,
    goToNextMonth,
    setDayState,
    toggleWeekContractOff,
    syncFromGoogle,
    clearGoogleEvents,
    paidLeaveCounters,
  };
}
