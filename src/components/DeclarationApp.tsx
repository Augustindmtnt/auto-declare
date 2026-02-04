"use client";

import { useCalendarState } from "@/hooks/useCalendarState";
import Calendar from "./Calendar";
import ResultsDashboard from "./ResultsDashboard";

export default function DeclarationApp() {
  const {
    displayedMonth,
    daysOff,
    grid,
    results,
    goToPreviousMonth,
    goToNextMonth,
    toggleDay,
  } = useCalendarState();

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Auto-URSSAF</h1>
          <p className="text-sm text-gray-500 mt-1">
            Calcul des déclarations Pajemploi
          </p>
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
