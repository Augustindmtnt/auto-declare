"use client";

import { useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { format, startOfMonth, endOfMonth, addDays } from "date-fns";

type SyncStatus = "idle" | "loading" | "synced" | "error";

interface GoogleSyncButtonProps {
  displayedMonth: Date;
  onSync: (dates: string[]) => void;
  onClear: () => void;
  syncedCount: number;
}

export default function GoogleSyncButton({
  displayedMonth,
  onSync,
  onClear,
  syncedCount,
}: GoogleSyncButtonProps) {
  const { data: session, status: sessionStatus } = useSession();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const handleSync = async () => {
    if (sessionStatus === "unauthenticated" || !session) {
      signIn("google");
      return;
    }

    setSyncStatus("loading");
    setError(null);

    try {
      const monthStart = startOfMonth(displayedMonth);
      const monthEnd = endOfMonth(displayedMonth);
      // Add a day to monthEnd to include the full last day
      const timeMax = addDays(monthEnd, 1);

      const params = new URLSearchParams({
        timeMin: format(monthStart, "yyyy-MM-dd"),
        timeMax: format(timeMax, "yyyy-MM-dd"),
      });

      const response = await fetch(`/api/calendar/events?${params}`);

      if (!response.ok) {
        if (response.status === 401) {
          // Session expired, re-authenticate
          signIn("google");
          return;
        }
        throw new Error("Failed to fetch calendar events");
      }

      const data = await response.json();
      onSync(data.daysOff);
      setSyncStatus("synced");
    } catch (err) {
      console.error("Sync error:", err);
      setError("Erreur lors de la synchronisation");
      setSyncStatus("error");
    }
  };

  const handleClear = () => {
    onClear();
    setSyncStatus("idle");
    setError(null);
  };

  const isLoading = syncStatus === "loading" || sessionStatus === "loading";

  return (
    <div className="flex items-center gap-2">
      {syncStatus === "synced" && syncedCount > 0 ? (
        <>
          <span className="text-sm text-green-600">
            {syncedCount} jour{syncedCount > 1 ? "s" : ""} importé
            {syncedCount > 1 ? "s" : ""}
          </span>
          <button
            onClick={handleClear}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Effacer
          </button>
        </>
      ) : (
        <button
          onClick={handleSync}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <svg
              className="w-4 h-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
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
