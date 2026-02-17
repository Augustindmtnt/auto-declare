import Link from "next/link";
import { CHILDREN, WEEKS_PER_YEAR, HOURS_PER_WEEK, MAJORED_HOURS_THRESHOLD } from "@/lib/constants";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

function formatDate(dateStr: string): string {
  return format(new Date(dateStr), "d MMMM yyyy", { locale: fr });
}

export default function ContratsPage() {
  const normalHoursPerWeek = Math.min(HOURS_PER_WEEK, MAJORED_HOURS_THRESHOLD);
  const majoredHoursPerWeek = Math.max(0, HOURS_PER_WEEK - MAJORED_HOURS_THRESHOLD);

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex items-center gap-4">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
            &larr; Retour
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">Contrats</h1>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CHILDREN.map((child) => (
            <div key={child.name} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4">{child.name}</h3>
              <div className="divide-y divide-gray-100">
                <Row label="Date de début" value={formatDate(child.contractStartDate)} />
                <Row label="Salaire mensuel" value={`${child.monthlySalary.toFixed(2)} \u20ac`} />
                <Row label="Taux horaire net" value={`${child.netHourlyRate.toFixed(2)} \u20ac/h`} />
                <Row label="Taux horaire majoré" value={`${child.majoredHourRate.toFixed(2)} \u20ac/h`} />
                <Row label="Semaines travaillées / an" value={`${WEEKS_PER_YEAR}`} />
                <Row label="Heures / semaine" value={`${HOURS_PER_WEEK} h (${normalHoursPerWeek} h + ${majoredHoursPerWeek} h majorées)`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-gray-700">{label}</span>
      <span className="text-sm font-mono text-gray-900">{value}</span>
    </div>
  );
}
