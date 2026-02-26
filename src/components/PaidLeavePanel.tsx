"use client";

import { PaidLeaveCounters } from "@/lib/types";

function periodLabel(start: Date, end: Date): string {
  return `Congés payés ${start.getFullYear()}–${end.getFullYear()}`;
}

function ChildPaidLeaveSection({ childName, counters }: { childName: string; counters: PaidLeaveCounters }) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-1">Congés payés — {childName}</p>
      <div>
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-gray-700">
            {periodLabel(counters.previousPeriodStart, counters.previousPeriodEnd)}
          </span>
          <span className="text-sm font-mono text-gray-900">
            {counters.available} j
          </span>
        </div>
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-gray-700">
            {periodLabel(counters.currentPeriodStart, counters.currentPeriodEnd)}
          </span>
          <span className="text-sm font-mono text-gray-700">
            {counters.acquiring} j
          </span>
        </div>
      </div>
    </div>
  );
}

export default function PaidLeavePanel({
  childData,
}: {
  childData: { childName: string; counters: PaidLeaveCounters }[];
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-base font-semibold text-gray-900 mb-4">Congés payés</h3>
      <div className="space-y-4">
        {childData.map(({ childName, counters }, idx) => (
          <div key={childName} className={idx > 0 ? "pt-4 border-t border-gray-100" : ""}>
            <ChildPaidLeaveSection childName={childName} counters={counters} />
          </div>
        ))}
      </div>
    </div>
  );
}
