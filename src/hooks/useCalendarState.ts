"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { addMonths, subMonths, endOfMonth, startOfWeek, addDays, format } from "date-fns";
import { buildCalendarGrid, getBankHolidays } from "@/lib/calendar-utils";
import { computeDeclaration } from "@/lib/calculations";
import {
  getReferencePeriod,
  getPreviousReferencePeriod,
  computeWorkedWeeks,
  computeAcquiredPaidLeave,
  computeAcquiredPaidLeaveRaw,
  countPaidLeaveTakenInPeriod,
  computePaidLeaveSaturdayDays,
} from "@/lib/paid-leave";
import { computeMonthlySalary } from "@/lib/constants";
import { CalendarWeek, DeclarationResult, PaidLeaveCounters } from "@/lib/types";
import { useContracts } from "./useContracts";
import { useGoogleEvents } from "@/contexts/GoogleEventsContext";

type DayState = "off" | "sick" | "paid_leave" | "contract_off";

export type ChildSets = {
  daysOff: Set<string>;
  sickLeaveDays: Set<string>;
  paidLeaveDays: Set<string>;
  contractOffDays: Set<string>;
};

export function useCalendarState() {
  const { children } = useContracts();
  const [displayedMonth, setDisplayedMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  // Per-child day states: childName -> dateKey -> DayState
  const [childDayStates, setChildDayStates] = useState<Map<string, Map<string, DayState>>>(() => new Map());
  const [calendarMode, setCalendarMode] = useState<string>("tous");
  const [isHydrated, setIsHydrated] = useState(false);
  const { events: googleEvents } = useGoogleEvents();

  // Refs for stable callbacks (avoid stale closures)
  const calendarModeRef = useRef(calendarMode);
  calendarModeRef.current = calendarMode;
  const childrenRef = useRef(children);
  childrenRef.current = children;
  const paidLeaveAvailableRef = useRef<Map<string, boolean>>(new Map());

  // Per-child derived sets
  const perChildSets = useMemo<Map<string, ChildSets>>(() => {
    const result = new Map<string, ChildSets>();
    for (const child of children) {
      const days = childDayStates.get(child.name) ?? new Map<string, DayState>();
      result.set(child.name, {
        daysOff: new Set([...days].filter(([, s]) => s === "off").map(([k]) => k)),
        sickLeaveDays: new Set([...days].filter(([, s]) => s === "sick").map(([k]) => k)),
        paidLeaveDays: new Set([...days].filter(([, s]) => s === "paid_leave").map(([k]) => k)),
        contractOffDays: new Set([...days].filter(([, s]) => s === "contract_off").map(([k]) => k)),
      });
    }
    return result;
  }, [childDayStates, children]);

  // Load from localStorage after hydration (migrates old per-state keys)
  useEffect(() => {
    const map = new Map<string, Map<string, DayState>>();

    // Try new format first
    const savedNew = localStorage.getItem("childDayStates");
    if (savedNew) {
      try {
        const parsed = JSON.parse(savedNew) as Record<string, Record<string, DayState>>;
        for (const [childName, days] of Object.entries(parsed)) {
          map.set(childName, new Map(Object.entries(days)));
        }
      } catch { /* ignore */ }
    }

    // Migrate from old format if new format absent
    if (map.size === 0) {
      const legacy = new Map<string, DayState>();
      const load = (key: string, state: DayState) => {
        const saved = localStorage.getItem(key);
        if (saved) for (const k of JSON.parse(saved) as string[]) legacy.set(k, state);
      };
      load("daysOff", "off");
      load("sickLeaveDays", "sick");
      load("paidLeaveDays", "paid_leave");
      load("contractOffDays", "contract_off");
      if (legacy.size > 0) {
        for (const child of childrenRef.current) {
          map.set(child.name, new Map(legacy));
        }
      }
    }

    if (map.size > 0) setChildDayStates(map);
    setIsHydrated(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only on mount

  // Persist to localStorage
  useEffect(() => {
    if (isHydrated) {
      const obj: Record<string, Record<string, DayState>> = {};
      for (const [childName, days] of childDayStates) {
        obj[childName] = Object.fromEntries(days);
      }
      localStorage.setItem("childDayStates", JSON.stringify(obj));
    }
  }, [childDayStates, isHydrated]);

  const goToPreviousMonth = useCallback(() => setDisplayedMonth((m) => subMonths(m, 1)), []);
  const goToNextMonth = useCallback(() => setDisplayedMonth((m) => addMonths(m, 1)), []);

  const setDayState = useCallback((dateKey: string, state: "worked" | "off" | "sick" | "paid_leave") => {
    setChildDayStates((prev) => {
      const next = new Map(prev);
      const mode = calendarModeRef.current;
      const activeChildren = mode === "tous"
        ? childrenRef.current
        : childrenRef.current.filter(c => c.name === mode);

      for (const child of activeChildren) {
        const childMap = new Map(next.get(child.name) ?? new Map<string, DayState>());
        let effectiveState = state;

        // Auto-downgrade paid_leave → off if child has no balance in "tous" mode
        if (state === "paid_leave" && mode === "tous") {
          const available = paidLeaveAvailableRef.current.get(child.name) ?? false;
          if (!available) effectiveState = "off";
        }

        if (effectiveState === "worked") {
          childMap.delete(dateKey);
        } else {
          childMap.set(dateKey, effectiveState as DayState);
        }
        next.set(child.name, childMap);
      }
      return next;
    });
  }, []);

  const toggleWeekContractOff = useCallback((mondayKey: string) => {
    setChildDayStates((prev) => {
      const next = new Map(prev);
      const monday = new Date(mondayKey);
      const keys: string[] = [];
      for (let i = 0; i < 5; i++) keys.push(format(addDays(monday, i), "yyyy-MM-dd"));

      // Toggle: off if ALL children have ALL weekdays as contract_off, else set all
      const allOff = childrenRef.current.every(child => {
        const childMap = prev.get(child.name) ?? new Map();
        return keys.every(k => childMap.get(k) === "contract_off");
      });

      for (const child of childrenRef.current) {
        const childMap = new Map(next.get(child.name) ?? new Map<string, DayState>());
        for (const k of keys) {
          if (allOff) childMap.delete(k);
          else childMap.set(k, "contract_off");
        }
        next.set(child.name, childMap);
      }
      return next;
    });
  }, []);

  const grid: CalendarWeek[] = useMemo(() => buildCalendarGrid(displayedMonth), [displayedMonth]);

  // Per-child paid leave data with contract start date clamping
  const perChildPaidLeaveData = useMemo(() => {
    const monthEnd = endOfMonth(displayedMonth);
    const currentPeriod = getReferencePeriod(displayedMonth);
    const previousPeriod = getPreviousReferencePeriod(displayedMonth);

    const bankHolidays = new Set<string>();
    for (const year of [currentPeriod.start.getFullYear(), currentPeriod.end.getFullYear()]) {
      for (const h of getBankHolidays(year)) bankHolidays.add(h);
    }

    return children.map(child => {
      const contractStart = new Date(child.contractStartDate);
      const sets = perChildSets.get(child.name) ?? {
        daysOff: new Set<string>(), sickLeaveDays: new Set<string>(),
        paidLeaveDays: new Set<string>(), contractOffDays: new Set<string>(),
      };

      // Clamp period starts to child's contract start date
      const effectivePrevStart = new Date(Math.max(previousPeriod.start.getTime(), contractStart.getTime()));
      const effectiveCurrentStart = new Date(Math.max(currentPeriod.start.getTime(), contractStart.getTime()));

      const workedWeeksPrev = computeWorkedWeeks(
        effectivePrevStart, previousPeriod.end,
        sets.daysOff, sets.sickLeaveDays, sets.paidLeaveDays, sets.contractOffDays
      );
      const acquiredPrevious = computeAcquiredPaidLeave(workedWeeksPrev);

      const acquiringEnd = monthEnd < currentPeriod.end ? monthEnd : currentPeriod.end;
      const workedWeeksCurrent = computeWorkedWeeks(
        effectiveCurrentStart, acquiringEnd,
        sets.daysOff, sets.sickLeaveDays, sets.paidLeaveDays, sets.contractOffDays
      );
      const acquiringRaw = computeAcquiredPaidLeaveRaw(workedWeeksCurrent);

      // Use effectiveCurrentStart so paid leave before contract start doesn't
      // count against this child's balance (avoids double-counting migrated data)
      const paidLeaveSaturdayDays = computePaidLeaveSaturdayDays(
        sets.paidLeaveDays, bankHolidays, acquiredPrevious,
        effectiveCurrentStart, currentPeriod.end, acquiringRaw
      );

      const takenInCurrent = countPaidLeaveTakenInPeriod(
        effectiveCurrentStart, currentPeriod.end, sets.paidLeaveDays, paidLeaveSaturdayDays
      );

      const available = Math.max(0, acquiredPrevious - takenInCurrent);
      const takenFromP = Math.max(0, takenInCurrent - acquiredPrevious);
      const acquiring = Math.max(0, Math.ceil(acquiringRaw - takenFromP));

      return {
        childName: child.name,
        paidLeaveCounters: {
          acquiredPrevious, takenInCurrent, available, acquiring,
          currentPeriodStart: currentPeriod.start, currentPeriodEnd: currentPeriod.end,
          previousPeriodStart: previousPeriod.start, previousPeriodEnd: previousPeriod.end,
        } as PaidLeaveCounters,
        paidLeaveSaturdayDays,
      };
    });
  }, [children, perChildSets, displayedMonth]);

  // Keep ref up-to-date for auto-downgrade logic in setDayState
  const paidLeaveAvailableMap = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const { childName, paidLeaveCounters } of perChildPaidLeaveData) {
      map.set(childName, paidLeaveCounters.available + paidLeaveCounters.acquiring > 0);
    }
    return map;
  }, [perChildPaidLeaveData]);
  paidLeaveAvailableRef.current = paidLeaveAvailableMap;

  // Active sets for calendar display:
  // - Per-child mode: use that child's sets directly
  // - "tous" mode: intersection (all children must agree on state for background)
  const activeSets = useMemo<ChildSets>(() => {
    if (calendarMode !== "tous") {
      return perChildSets.get(calendarMode) ?? {
        daysOff: new Set<string>(), sickLeaveDays: new Set<string>(),
        paidLeaveDays: new Set<string>(), contractOffDays: new Set<string>(),
      };
    }
    const allKeys = new Set<string>();
    for (const [, sets] of perChildSets) {
      for (const k of sets.daysOff) allKeys.add(k);
      for (const k of sets.sickLeaveDays) allKeys.add(k);
      for (const k of sets.paidLeaveDays) allKeys.add(k);
      for (const k of sets.contractOffDays) allKeys.add(k);
    }
    const daysOff = new Set<string>();
    const sickLeaveDays = new Set<string>();
    const paidLeaveDays = new Set<string>();
    const contractOffDays = new Set<string>();
    for (const key of allKeys) {
      if (children.every(c => perChildSets.get(c.name)?.daysOff.has(key))) daysOff.add(key);
      if (children.every(c => perChildSets.get(c.name)?.sickLeaveDays.has(key))) sickLeaveDays.add(key);
      if (children.every(c => perChildSets.get(c.name)?.paidLeaveDays.has(key))) paidLeaveDays.add(key);
      if (children.every(c => perChildSets.get(c.name)?.contractOffDays.has(key))) contractOffDays.add(key);
    }
    return { daysOff, sickLeaveDays, paidLeaveDays, contractOffDays };
  }, [calendarMode, children, perChildSets]);

  // Days where children have different states (only relevant in "tous" mode)
  const mixedDays = useMemo<Set<string>>(() => {
    if (calendarMode !== "tous" || children.length <= 1) return new Set<string>();
    const mixed = new Set<string>();
    const allKeys = new Set<string>();
    for (const [, sets] of perChildSets) {
      for (const k of sets.daysOff) allKeys.add(k);
      for (const k of sets.sickLeaveDays) allKeys.add(k);
      for (const k of sets.paidLeaveDays) allKeys.add(k);
      for (const k of sets.contractOffDays) allKeys.add(k);
    }
    for (const key of allKeys) {
      const states = new Set<string>();
      for (const child of children) {
        const sets = perChildSets.get(child.name)!;
        if (sets.sickLeaveDays.has(key)) states.add("sick");
        else if (sets.paidLeaveDays.has(key)) states.add("paid_leave");
        else if (sets.contractOffDays.has(key)) states.add("contract_off");
        else if (sets.daysOff.has(key)) states.add("off");
        else states.add("worked");
      }
      if (states.size > 1) mixed.add(key);
    }
    return mixed;
  }, [calendarMode, children, perChildSets]);

  // Auto-Saturday days: union in "tous" mode, per-child otherwise
  const paidLeaveSaturdayDays = useMemo<Set<string>>(() => {
    if (calendarMode !== "tous") {
      return perChildPaidLeaveData.find(d => d.childName === calendarMode)?.paidLeaveSaturdayDays ?? new Set<string>();
    }
    const union = new Set<string>();
    for (const { paidLeaveSaturdayDays: sat } of perChildPaidLeaveData) {
      for (const k of sat) union.add(k);
    }
    return union;
  }, [calendarMode, perChildPaidLeaveData]);

  // paidLeaveAvailable for dropdown: any child has balance in "tous" mode
  const paidLeaveAvailable = useMemo<boolean>(() => {
    if (calendarMode !== "tous") return paidLeaveAvailableMap.get(calendarMode) ?? false;
    return children.some(c => paidLeaveAvailableMap.get(c.name) ?? false);
  }, [calendarMode, children, paidLeaveAvailableMap]);

  const results: DeclarationResult[] = useMemo(() =>
    children.map(child => {
      const monthlySalary = computeMonthlySalary(child.netHourlyRate);
      const sets = perChildSets.get(child.name) ?? {
        daysOff: new Set<string>(), sickLeaveDays: new Set<string>(),
        paidLeaveDays: new Set<string>(), contractOffDays: new Set<string>(),
      };
      const acquiredPrevious = perChildPaidLeaveData.find(d => d.childName === child.name)
        ?.paidLeaveCounters.acquiredPrevious ?? 0;
      return computeDeclaration(
        child, monthlySalary, displayedMonth,
        sets.daysOff, sets.sickLeaveDays, sets.paidLeaveDays, sets.contractOffDays,
        acquiredPrevious
      );
    }),
  [children, displayedMonth, perChildSets, perChildPaidLeaveData]);

  return {
    displayedMonth,
    daysOff: activeSets.daysOff,
    sickLeaveDays: activeSets.sickLeaveDays,
    paidLeaveDays: activeSets.paidLeaveDays,
    contractOffDays: activeSets.contractOffDays,
    mixedDays,
    perChildSets,
    paidLeaveSaturdayDays,
    paidLeaveAvailable,
    googleEvents,
    grid,
    results,
    goToPreviousMonth,
    goToNextMonth,
    setDayState,
    toggleWeekContractOff,
    calendarMode,
    setCalendarMode,
    perChildPaidLeaveData,
    children,
  };
}
