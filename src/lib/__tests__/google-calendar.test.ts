import { describe, it, expect } from "vitest";
import {
  eventMatchesKeyword,
  extractDatesFromEvent,
  filterEventsForDaysOff,
  DAYS_OFF_KEYWORDS,
} from "../google-calendar";
import { GoogleCalendarEvent } from "../types";

describe("eventMatchesKeyword", () => {
  it("should match events containing days off keywords", () => {
    expect(eventMatchesKeyword("Congé annuel")).toBe(true);
    expect(eventMatchesKeyword("vacances été")).toBe(true);
    expect(eventMatchesKeyword("Absent - RDV médecin")).toBe(true);
    expect(eventMatchesKeyword("Jour férié")).toBe(true);
    expect(eventMatchesKeyword("MALADIE")).toBe(true);
    expect(eventMatchesKeyword("arrêt maladie")).toBe(true);
  });

  it("should not match unrelated events", () => {
    expect(eventMatchesKeyword("Réunion équipe")).toBe(false);
    expect(eventMatchesKeyword("Déjeuner client")).toBe(false);
    expect(eventMatchesKeyword("Call with team")).toBe(false);
  });

  it("should be case insensitive", () => {
    expect(eventMatchesKeyword("CONGÉ")).toBe(true);
    expect(eventMatchesKeyword("Vacances")).toBe(true);
    expect(eventMatchesKeyword("ABSENT")).toBe(true);
  });
});

describe("extractDatesFromEvent", () => {
  it("should extract single date from single-day event", () => {
    const event: GoogleCalendarEvent = {
      id: "1",
      summary: "Congé",
      start: "2025-01-15",
      end: "2025-01-16", // Google all-day events have exclusive end date
    };
    expect(extractDatesFromEvent(event)).toEqual(["2025-01-15"]);
  });

  it("should extract multiple dates from multi-day event", () => {
    const event: GoogleCalendarEvent = {
      id: "2",
      summary: "Vacances",
      start: "2025-01-20",
      end: "2025-01-24", // Exclusive end date
    };
    expect(extractDatesFromEvent(event)).toEqual([
      "2025-01-20",
      "2025-01-21",
      "2025-01-22",
      "2025-01-23",
    ]);
  });

  it("should handle same-day start and end (edge case)", () => {
    const event: GoogleCalendarEvent = {
      id: "3",
      summary: "Event",
      start: "2025-01-15",
      end: "2025-01-15",
    };
    // When end is same as start, we still get the start date
    expect(extractDatesFromEvent(event)).toEqual(["2025-01-15"]);
  });
});

describe("filterEventsForDaysOff", () => {
  it("should filter only events with days off keywords", () => {
    const events: GoogleCalendarEvent[] = [
      { id: "1", summary: "Réunion", start: "2025-01-10", end: "2025-01-11" },
      { id: "2", summary: "Congé", start: "2025-01-15", end: "2025-01-16" },
      { id: "3", summary: "Call", start: "2025-01-17", end: "2025-01-18" },
      { id: "4", summary: "Vacances", start: "2025-01-20", end: "2025-01-22" },
    ];

    const daysOff = filterEventsForDaysOff(events);
    expect(daysOff).toEqual(["2025-01-15", "2025-01-20", "2025-01-21"]);
  });

  it("should deduplicate overlapping dates", () => {
    const events: GoogleCalendarEvent[] = [
      { id: "1", summary: "Congé 1", start: "2025-01-15", end: "2025-01-17" },
      { id: "2", summary: "Congé 2", start: "2025-01-16", end: "2025-01-18" },
    ];

    const daysOff = filterEventsForDaysOff(events);
    expect(daysOff).toEqual(["2025-01-15", "2025-01-16", "2025-01-17"]);
  });

  it("should return empty array when no matching events", () => {
    const events: GoogleCalendarEvent[] = [
      { id: "1", summary: "Meeting", start: "2025-01-10", end: "2025-01-11" },
    ];

    expect(filterEventsForDaysOff(events)).toEqual([]);
  });

  it("should return sorted dates", () => {
    const events: GoogleCalendarEvent[] = [
      { id: "1", summary: "Congé B", start: "2025-01-20", end: "2025-01-21" },
      { id: "2", summary: "Congé A", start: "2025-01-10", end: "2025-01-11" },
    ];

    const daysOff = filterEventsForDaysOff(events);
    expect(daysOff).toEqual(["2025-01-10", "2025-01-20"]);
  });
});

describe("DAYS_OFF_KEYWORDS", () => {
  it("should contain expected French keywords", () => {
    expect(DAYS_OFF_KEYWORDS).toContain("congé");
    expect(DAYS_OFF_KEYWORDS).toContain("vacances");
    expect(DAYS_OFF_KEYWORDS).toContain("absent");
    expect(DAYS_OFF_KEYWORDS).toContain("maladie");
    expect(DAYS_OFF_KEYWORDS).toContain("férié");
  });
});
