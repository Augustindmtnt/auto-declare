"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";

export interface PaidLeaveCounters {
  acquiredPrevious: number;
  takenInCurrent: number;
  available: number;
  acquiring: number;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  previousPeriodStart: Date;
  previousPeriodEnd: Date;
}

function formatPeriod(start: Date, end: Date): string {
  const s = format(start, "MMMM yyyy", { locale: fr });
  const e = format(end, "MMMM yyyy", { locale: fr });
  return `${s} – ${e}`;
}

export default function PaidLeavePanel({ counters }: { counters: PaidLeaveCounters }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-base font-semibold text-gray-900 mb-4">Congés payés</h3>
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
