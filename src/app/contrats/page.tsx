"use client";

import Link from "next/link";
import { useState } from "react";
import { useContracts } from "@/hooks/useContracts";
import { computeMonthlySalary, WEEKS_PER_YEAR, HOURS_PER_WEEK, MAJORED_HOURS_THRESHOLD } from "@/lib/constants";

const NORMAL_HOURS_PER_WEEK = Math.min(HOURS_PER_WEEK, MAJORED_HOURS_THRESHOLD);
const MAJORED_HOURS_PER_WEEK = Math.max(0, HOURS_PER_WEEK - MAJORED_HOURS_THRESHOLD);

export default function ContratsPage() {
  const { children, updateChild, isHydrated } = useContracts();

  if (!isHydrated) return null;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex items-center gap-4">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
            &larr; Retour
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">Contrats</h1>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {children.map((child, index) => {
            const monthlySalary = computeMonthlySalary(child.netHourlyRate);
            return (
              <div key={child.name} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-base font-semibold text-gray-900 mb-4">{child.name}</h3>
                <div className="divide-y divide-gray-100">
                  <EditableDateRow
                    label="Date de début"
                    value={child.contractStartDate}
                    onChange={(v) => updateChild(index, { contractStartDate: v })}
                  />
                  <EditableNumberRow
                    label="Taux horaire net"
                    value={child.netHourlyRate}
                    suffix=" €/h"
                    step={0.01}
                    onChange={(v) => updateChild(index, { netHourlyRate: v })}
                  />
                  <EditableNumberRow
                    label="Taux horaire majoré"
                    value={child.majoredHourRate}
                    suffix=" €/h"
                    step={0.01}
                    onChange={(v) => updateChild(index, { majoredHourRate: v })}
                  />
                  <ReadOnlyRow
                    label="Salaire mensuel net"
                    value={`${monthlySalary.toFixed(2)} €`}
                    tooltip={`${child.netHourlyRate} €/h × ${NORMAL_HOURS_PER_WEEK} h × ${WEEKS_PER_YEAR} sem / 12`}
                  />
                  <ReadOnlyRow
                    label="Semaines / an"
                    value={`${WEEKS_PER_YEAR}`}
                  />
                  <ReadOnlyRow
                    label="Heures / semaine"
                    value={`${HOURS_PER_WEEK} h (${NORMAL_HOURS_PER_WEEK} h + ${MAJORED_HOURS_PER_WEEK} h majorées)`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ReadOnlyRow({ label, value, tooltip }: { label: string; value: string; tooltip?: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-gray-700">{label}</span>
      <span className="text-sm font-mono text-gray-400" title={tooltip}>{value}</span>
    </div>
  );
}

function EditableNumberRow({
  label,
  value,
  suffix,
  step,
  onChange,
}: {
  label: string;
  value: number;
  suffix: string;
  step: number;
  onChange: (value: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const startEdit = () => {
    setDraft(String(value));
    setEditing(true);
  };

  const commit = () => {
    const parsed = parseFloat(draft);
    if (!isNaN(parsed) && parsed > 0) {
      onChange(parsed);
    }
    setEditing(false);
  };

  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-gray-700">{label}</span>
      {editing ? (
        <input
          type="number"
          step={step}
          className="w-28 text-sm font-mono text-right border border-gray-300 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
          autoFocus
        />
      ) : (
        <button
          className="text-sm font-mono text-gray-900 hover:text-blue-600 transition-colors cursor-pointer"
          onClick={startEdit}
        >
          {value.toFixed(2)}{suffix}
        </button>
      )}
    </div>
  );
}

function EditableDateRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const startEdit = () => {
    setDraft(value);
    setEditing(true);
  };

  const commit = () => {
    if (draft && !isNaN(new Date(draft).getTime())) {
      onChange(draft);
    }
    setEditing(false);
  };

  const displayDate = new Date(value).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-gray-700">{label}</span>
      {editing ? (
        <input
          type="date"
          className="text-sm font-mono border border-gray-300 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
          autoFocus
        />
      ) : (
        <button
          className="text-sm font-mono text-gray-900 hover:text-blue-600 transition-colors cursor-pointer"
          onClick={startEdit}
        >
          {displayDate}
        </button>
      )}
    </div>
  );
}
