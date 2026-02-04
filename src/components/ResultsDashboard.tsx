"use client";

import { DeclarationResult } from "@/lib/types";
import ResultsPanel from "./ResultsPanel";

interface ResultsDashboardProps {
  results: DeclarationResult[];
}

export default function ResultsDashboard({ results }: ResultsDashboardProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {results.map((result) => (
        <ResultsPanel key={result.childName} result={result} />
      ))}
    </div>
  );
}
