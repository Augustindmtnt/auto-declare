"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { PaidLeaveCounters } from "@/lib/types";

function formatPeriod(start: Date, end: Date): string {
  const s = format(start, "MMMM yyyy", { locale: fr });
  const e = format(end, "MMMM yyyy", { locale: fr });
  return `${s} – ${e}`;
}

function ChildPaidLeaveSection({ childName, counters }: { childName: string; counters: PaidLeaveCounters }) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-1">Congés payés — {childName}</p>
      <div className="divide-y divide-gray-100">
        <div className="flex items-center justify-between py-2">
          <div>
            <span className="text-sm text-gray-700">Solde congés payés</span>
            <span className="block text-xs text-gray-400">
              {formatPeriod(counters.previousPeriodStart, counters.previousPeriodEnd)}
            </span>
          </div>
          <span className="text-sm font-mono text-gray-900 font-semibold">
            {counters.available} / {counters.acquiredPrevious} j
          </span>
        </div>
        <div className="flex items-center justify-between py-2">
          <div>
            <span className="text-sm text-gray-700">Solde période en cours</span>
            <span className="block text-xs text-gray-400">
              {formatPeriod(counters.currentPeriodStart, counters.currentPeriodEnd)}
            </span>
          </div>
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
