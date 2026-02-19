"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { GoogleCalendarEvent } from "@/lib/types";

interface GoogleEventsContextType {
  events: GoogleCalendarEvent[];
  setEvents: (events: GoogleCalendarEvent[]) => void;
  clearEvents: () => void;
}

const GoogleEventsContext = createContext<GoogleEventsContextType>({
  events: [],
  setEvents: () => {},
  clearEvents: () => {},
});

export function GoogleEventsProvider({ children }: { children: ReactNode }) {
  const [events, setEventsState] = useState<GoogleCalendarEvent[]>([]);
  return (
    <GoogleEventsContext.Provider value={{
      events,
      setEvents: setEventsState,
      clearEvents: () => setEventsState([]),
    }}>
      {children}
    </GoogleEventsContext.Provider>
  );
}

export function useGoogleEvents() {
  return useContext(GoogleEventsContext);
}
