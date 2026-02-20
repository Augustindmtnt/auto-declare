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
    mixedDays,
    perChildSets,
    googleEvents,
    grid,
    results,
    goToPreviousMonth,
    goToNextMonth,
    setDayState,
    toggleWeekContractOff,
    paidLeaveAvailable,
    calendarMode,
    setCalendarMode,
    perChildPaidLeaveData,
    children,
  } = useCalendarState();

  const paidLeaveChildData = perChildPaidLeaveData.map(({ childName, paidLeaveCounters }) => ({
    childName,
    counters: paidLeaveCounters,
  }));

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
          mixedDays={mixedDays}
          perChildSets={perChildSets}
          googleEvents={googleEvents}
          paidLeaveAvailable={paidLeaveAvailable}
          calendarMode={calendarMode}
          setCalendarMode={setCalendarMode}
          children={children}
          onPrevious={goToPreviousMonth}
          onNext={goToNextMonth}
          onSetDayState={setDayState}
          onToggleWeekContractOff={toggleWeekContractOff}
        />

        <PaidLeavePanel childData={paidLeaveChildData} />

        <ResultsDashboard results={results} />
      </div>
    </div>
  );
}
