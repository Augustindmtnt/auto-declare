"use client";

import { DeclarationResult } from "@/lib/types";
import { formatEuro, formatFrenchNumber } from "@/lib/calendar-utils";
import CopyButton from "./CopyButton";

interface ResultsPanelProps {
  result: DeclarationResult;
}

function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <span className="relative group">
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs px-3 py-2 rounded-lg bg-gray-900 text-white text-xs leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-pre-line">
        {text}
      </span>
    </span>
  );
}

function ResultRow({
  label,
  value,
  copyValue,
  highlight,
  tooltip,
  negative,
}: {
  label: string;
  value: string;
  copyValue: string;
  highlight?: boolean;
  tooltip?: string;
  negative?: boolean;
}) {
  const labelEl = tooltip ? (
    <Tooltip text={tooltip}>
      <span className="text-sm underline decoration-dotted cursor-help">{label}</span>
    </Tooltip>
  ) : (
    <span className="text-sm">{label}</span>
  );

  return (
    <div
      className={`flex items-center justify-between py-2 ${
        highlight ? "font-semibold text-gray-900" : negative ? "text-rose-700" : "text-gray-700"
      }`}
    >
      {labelEl}
      <span className="flex items-center text-sm font-mono">
        {value}
        <CopyButton value={copyValue} />
      </span>
    </div>
  );
}

export default function ResultsPanel({ result }: ResultsPanelProps) {
  const hasSickLeave = result.sickLeaveDeduction > 0;
  const hasCongesPayes = result.congesPayes > 0;

  const sickLeaveTooltip = hasSickLeave
    ? `Taux horaire : salaire mensuel (${formatEuro(result.monthlySalary)}) / heures normales du mois (${formatFrenchNumber(result.normalHoursInMonth)} h) = ${formatFrenchNumber(result.hourlyRate)} €/h\nDéduction : ${formatFrenchNumber(result.hourlyRate)} €/h × ${formatFrenchNumber(result.sickLeaveHours)} h = ${formatEuro(result.sickLeaveDeduction)}`
    : undefined;

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
        {hasSickLeave && (
          <>
            <ResultRow
              label={`Maladie/sans solde (${result.sickLeaveDays} j)`}
              value={`- ${formatEuro(result.sickLeaveDeduction)}`}
              copyValue={formatFrenchNumber(result.sickLeaveDeduction)}
              tooltip={sickLeaveTooltip}
              negative
            />
            <ResultRow
              label="Salaire après déduction"
              value={formatEuro(result.adjustedSalary)}
              copyValue={formatFrenchNumber(result.adjustedSalary)}
            />
          </>
        )}
        <ResultRow
          label={`Heures majorées (${formatFrenchNumber(result.majoredHoursCount)} h)`}
          value={formatEuro(result.majoredHoursAmount)}
          copyValue={formatFrenchNumber(result.majoredHoursAmount)}
        />
        <ResultRow
          label={`Congés payés (${result.congesPayesDaysAcquired} j)`}
          value={formatEuro(result.congesPayes)}
          copyValue={formatFrenchNumber(result.congesPayes)}
          tooltip={hasCongesPayes ? `Méthode la plus favorable retenue.\nJours acquis : ${result.congesPayesDaysAcquired} j ouvrables` : undefined}
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
