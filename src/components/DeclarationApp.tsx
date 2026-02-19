"use client";

import { useCalendarState } from "@/hooks/useCalendarState";
import Calendar from "./Calendar";
import ResultsDashboard from "./ResultsDashboard";
import PaidLeavePanel from "./PaidLeavePanel";

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
    paidLeaveCounters,
  } = useCalendarState();

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-6xl mx-auto space-y-6">
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
