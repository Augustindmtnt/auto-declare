"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface CalendarHeaderProps {
  displayedMonth: Date;
  onPrevious: () => void;
  onNext: () => void;
}

export default function CalendarHeader({
  displayedMonth,
  onPrevious,
  onNext,
}: CalendarHeaderProps) {
  const label = format(displayedMonth, "MMMM yyyy", { locale: fr });
  // Capitalize first letter
  const capitalizedLabel = label.charAt(0).toUpperCase() + label.slice(1);

  return (
    <div className="flex items-center justify-between mb-4">
      <button
        onClick={onPrevious}
        className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-600"
        aria-label="Mois précédent"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="12 4 6 10 12 16" />
        </svg>
      </button>
      <h2 className="text-lg font-semibold text-gray-900">{capitalizedLabel}</h2>
      <button
        onClick={onNext}
        className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-600"
        aria-label="Mois suivant"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="8 4 14 10 8 16" />
        </svg>
      </button>
    </div>
  );
}
