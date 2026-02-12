"use client";

import { useCalendarState } from "@/hooks/useCalendarState";
import Calendar from "./Calendar";
import ResultsDashboard from "./ResultsDashboard";
import GoogleSyncButton from "./GoogleSyncButton";

export default function DeclarationApp() {
  const {
    displayedMonth,
    daysOff,
    sickLeaveDays,
    googleEvents,
    grid,
    results,
    goToPreviousMonth,
    goToNextMonth,
    setDayState,
    syncFromGoogle,
    clearGoogleEvents,
  } = useCalendarState();

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">autodeclare</h1>
          <GoogleSyncButton
            onSync={syncFromGoogle}
            onClear={clearGoogleEvents}
            isSynced={googleEvents.length > 0}
          />
        </header>

        <Calendar
          displayedMonth={displayedMonth}
          grid={grid}
          daysOff={daysOff}
          sickLeaveDays={sickLeaveDays}
          googleEvents={googleEvents}
          onPrevious={goToPreviousMonth}
          onNext={goToNextMonth}
          onSetDayState={setDayState}
        />

        <ResultsDashboard results={results} />
      </div>
    </div>
  );
}
