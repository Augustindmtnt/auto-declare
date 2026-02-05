import { describe, it, expect } from "vitest";
import { getEventsForDate } from "../google-calendar";
import { GoogleCalendarEvent } from "../types";

describe("getEventsForDate", () => {
  it("should extract single date from single-day event", () => {
    const event: GoogleCalendarEvent = {
      id: "1",
      summary: "Congé",
      start: "2025-01-15",
      end: "2025-01-16", // Google all-day events have exclusive end date
    };
    expect(getEventsForDate(event)).toEqual(["2025-01-15"]);
  });

  it("should extract multiple dates from multi-day event", () => {
    const event: GoogleCalendarEvent = {
      id: "2",
      summary: "Vacances",
      start: "2025-01-20",
      end: "2025-01-24", // Exclusive end date
    };
    expect(getEventsForDate(event)).toEqual([
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
    expect(getEventsForDate(event)).toEqual(["2025-01-15"]);
  });
});

