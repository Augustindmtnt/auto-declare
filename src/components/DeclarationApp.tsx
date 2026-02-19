"use client";

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
    paidLeaveSaturdayDays,
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
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex justify-end">
          <GoogleSyncButton
            onSync={syncFromGoogle}
            onClear={clearGoogleEvents}
            isSynced={googleEvents.length > 0}
          />
        </div>

        <Calendar
          displayedMonth={displayedMonth}
          grid={grid}
          daysOff={daysOff}
          sickLeaveDays={sickLeaveDays}
          paidLeaveDays={paidLeaveDays}
          paidLeaveSaturdayDays={paidLeaveSaturdayDays}
          contractOffDays={contractOffDays}
          googleEvents={googleEvents}
          paidLeaveAvailable={paidLeaveCounters.available + paidLeaveCounters.acquiring > 0}
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
