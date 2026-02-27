"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface CalendarHeaderProps {
  displayedMonth: Date;
  onToday: () => void;
  onPrevious: () => void;
  onNext: () => void;
}

export default function CalendarHeader({
  displayedMonth,
  onToday,
  onPrevious,
  onNext,
}: CalendarHeaderProps) {
  const label = format(displayedMonth, "MMMM yyyy", { locale: fr });
  const capitalizedLabel = label.charAt(0).toUpperCase() + label.slice(1);
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
      <h2 className="text-lg font-semibold text-gray-900">{capitalizedLabel}</h2>
      <div className="flex items-center gap-1">
        <button
          onClick={onToday}
          className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer mr-1"
        >
          Aujourd'hui
        </button>
        <button
          onClick={onPrevious}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-600 cursor-pointer"
          aria-label="Mois précédent"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="10 3 5 8 10 13" />
          </svg>
        </button>
        <button
          onClick={onNext}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-600 cursor-pointer"
          aria-label="Mois suivant"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 3 11 8 6 13" />
          </svg>
        </button>
      </div>
    </div>
  );
}
