"use client";

import { useCalendarState } from "@/hooks/useCalendarState";
import Calendar from "./Calendar";
import ResultsDashboard from "./ResultsDashboard";
import GoogleSyncButton from "./GoogleSyncButton";

export default function DeclarationApp() {
  const {
    displayedMonth,
    daysOff,
    googleSyncedDays,
    grid,
    results,
    goToPreviousMonth,
    goToNextMonth,
    toggleDay,
    syncFromGoogle,
    clearGoogleDays,
  } = useCalendarState();

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="text-center space-y-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Auto-URSSAF</h1>
            <p className="text-sm text-gray-500 mt-1">
              Calcul des déclarations Pajemploi
            </p>
          </div>
          <div className="flex justify-center">
            <GoogleSyncButton
              displayedMonth={displayedMonth}
              onSync={syncFromGoogle}
              onClear={clearGoogleDays}
              syncedCount={googleSyncedDays.size}
            />
          </div>
        </header>

        <Calendar
          displayedMonth={displayedMonth}
          grid={grid}
          daysOff={daysOff}
          onPrevious={goToPreviousMonth}
          onNext={goToNextMonth}
          onToggle={toggleDay}
        />

        <ResultsDashboard results={results} />
      </div>
    </div>
  );
}
