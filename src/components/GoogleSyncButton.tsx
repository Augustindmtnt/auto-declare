"use client";

import { useState, useEffect, useRef } from "react";
import { signIn, useSession } from "next-auth/react";
import { format, subYears, addYears } from "date-fns";
import { useGoogleEvents } from "@/contexts/GoogleEventsContext";

type SyncStatus = "idle" | "loading" | "synced" | "error";

export default function GoogleSyncButton() {
  const { events, setEvents, clearEvents } = useGoogleEvents();
  const { data: session, status: sessionStatus } = useSession();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const hasAutoSynced = useRef(false);
  const isSynced = events.length > 0;

  // Auto-sync on mount when authenticated
  useEffect(() => {
    if (sessionStatus === "authenticated" && session && !hasAutoSynced.current && !isSynced) {
      if (session.error === "RefreshAccessTokenError") {
        signIn("google");
        return;
      }
      hasAutoSynced.current = true;
      handleSyncInternal();
    }
  }, [sessionStatus, session, isSynced]);

  const handleSyncInternal = async () => {
    setSyncStatus("loading");
    setError(null);

    try {
      const now = new Date();
      const params = new URLSearchParams({
        timeMin: format(subYears(now, 1), "yyyy-MM-dd"),
        timeMax: format(addYears(now, 1), "yyyy-MM-dd"),
      });

      const response = await fetch(`/api/calendar/events?${params}`);

      if (!response.ok) {
        if (response.status === 401) { signIn("google"); return; }
        throw new Error("Failed to fetch calendar events");
      }

      const data = await response.json();
      setEvents(data.events);
      setSyncStatus("synced");
    } catch (err) {
      console.error("Sync error:", err);
      setError("Erreur lors de la synchronisation");
      setSyncStatus("error");
    }
  };

  const handleSync = () => {
    if (sessionStatus === "unauthenticated" || !session || session.error) {
      signIn("google");
      return;
    }
    handleSyncInternal();
  };

  const handleClear = () => {
    clearEvents();
    setSyncStatus("idle");
    setError(null);
    hasAutoSynced.current = false;
  };

  const isLoading = syncStatus === "loading" || sessionStatus === "loading";

  return (
    <div className="flex items-center gap-2">
      {syncStatus === "synced" || isSynced ? (
        <button
          onClick={handleClear}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Synchronisé
        </button>
      ) : (
        <button
          onClick={handleSync}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.383 0 0 5.383 0 12s5.383 12 12 12 12-5.383 12-12S18.617 0 12 0zm-1.5 17.5l-4-4 1.41-1.41L10.5 14.67l6.09-6.09L18 10l-7.5 7.5z" />
            </svg>
          )}
          {isLoading ? "Synchronisation..." : "Sync Google Calendar"}
        </button>
      )}
      {syncStatus === "error" && error && (
        <span className="text-sm text-red-500">{error}</span>
      )}
    </div>
  );
}
