"use client";

import { DeclarationResult } from "@/lib/types";
import { formatEuro, formatFrenchNumber } from "@/lib/calendar-utils";
import CopyButton from "./CopyButton";

interface ResultsPanelProps {
  result: DeclarationResult;
}

function ResultRow({
  label,
  value,
  copyValue,
  highlight,
}: {
  label: string;
  value: string;
  copyValue: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between py-2 ${
        highlight ? "font-semibold text-gray-900" : "text-gray-700"
      }`}
    >
      <span className="text-sm">{label}</span>
      <span className="flex items-center text-sm font-mono">
        {value}
        <CopyButton value={copyValue} />
      </span>
    </div>
  );
}

export default function ResultsPanel({ result }: ResultsPanelProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-base font-semibold text-gray-900 mb-4">
        {result.childName}
      </h3>
      <div className="divide-y divide-gray-100">
        <ResultRow
          label="Salaire mensuel"
          value={formatEuro(result.monthlySalary)}
          copyValue={formatFrenchNumber(result.monthlySalary)}
        />
        <ResultRow
          label={`Heures majorées (${formatFrenchNumber(result.majoredHoursCount)} h)`}
          value={formatEuro(result.majoredHoursAmount)}
          copyValue={formatFrenchNumber(result.majoredHoursAmount)}
        />
        <ResultRow
          label="Salaire total"
          value={formatEuro(result.totalSalary)}
          copyValue={formatFrenchNumber(result.totalSalary)}
          highlight
        />
        <ResultRow
          label={`Indemnité d'entretien (${result.workedDays} j)`}
          value={formatEuro(result.maintenanceAllowance)}
          copyValue={formatFrenchNumber(result.maintenanceAllowance)}
        />
        <ResultRow
          label={`Indemnité de repas (${result.workedDays} j)`}
          value={formatEuro(result.mealAllowance)}
          copyValue={formatFrenchNumber(result.mealAllowance)}
        />
      </div>
    </div>
  );
}
