"use client";

import Link from "next/link";
import { useCalendarState } from "@/hooks/useCalendarState";
import Calendar from "./Calendar";
import ResultsDashboard from "./ResultsDashboard";
import PaidLeavePanel from "./PaidLeavePanel";
import GoogleSyncButton from "./GoogleSyncButton";

export default function DeclarationApp() {
  const {
    displayedMonth,
    daysOff,
    sickLeaveDays,
    paidLeaveDays,
    contractOffDays,
    googleEvents,
    grid,
    results,
    goToPreviousMonth,
    goToNextMonth,
    setDayState,
    toggleWeekContractOff,
    syncFromGoogle,
    clearGoogleEvents,
    paidLeaveCounters,
  } = useCalendarState();

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-gray-900">autodeclare</h1>
            <Link href="/contrats" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
              Contrats
            </Link>
          </div>
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
          paidLeaveDays={paidLeaveDays}
          contractOffDays={contractOffDays}
          googleEvents={googleEvents}
          onPrevious={goToPreviousMonth}
          onNext={goToNextMonth}
          onSetDayState={setDayState}
          onToggleWeekContractOff={toggleWeekContractOff}
        />

        <PaidLeavePanel counters={paidLeaveCounters} />

        <ResultsDashboard results={results} />
      </div>
    </div>
  );
}
