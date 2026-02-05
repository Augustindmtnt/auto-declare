"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { addMonths, subMonths } from "date-fns";
import { buildCalendarGrid } from "@/lib/calendar-utils";
import { computeDeclaration } from "@/lib/calculations";
import { CHILDREN } from "@/lib/constants";
import { CalendarWeek, DeclarationResult, GoogleCalendarEvent } from "@/lib/types";

export function useCalendarState() {
  const [displayedMonth, setDisplayedMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const [daysOff, setDaysOff] = useState<Set<string>>(() => new Set());
  const [isHydrated, setIsHydrated] = useState(false);
  const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>([]);

  // Load daysOff from localStorage after hydration
  useEffect(() => {
    const saved = localStorage.getItem("daysOff");
    if (saved) {
      setDaysOff(new Set(JSON.parse(saved)));
    }
    setIsHydrated(true);
  }, []);

  // Persist daysOff to localStorage (only after hydration to avoid overwriting)
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem("daysOff", JSON.stringify([...daysOff]));
    }
  }, [daysOff, isHydrated]);

  const goToPreviousMonth = useCallback(() => {
    setDisplayedMonth((m) => subMonths(m, 1));
  }, []);

  const goToNextMonth = useCallback(() => {
    setDisplayedMonth((m) => addMonths(m, 1));
  }, []);

  const toggleDay = useCallback((dateKey: string) => {
    setDaysOff((prev) => {
      const next = new Set(prev);
      if (next.has(dateKey)) {
        next.delete(dateKey);
      } else {
        next.add(dateKey);
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
    () => CHILDREN.map((child) => computeDeclaration(child, displayedMonth, daysOff)),
    [displayedMonth, daysOff]
  );

  return {
    displayedMonth,
    daysOff,
    googleEvents,
    grid,
    results,
    goToPreviousMonth,
    goToNextMonth,
    toggleDay,
    syncFromGoogle,
    clearGoogleEvents,
  };
}
