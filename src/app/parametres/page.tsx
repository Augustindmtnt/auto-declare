"use client";

import GoogleSyncButton from "@/components/GoogleSyncButton";

export default function ParametresPage() {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-xl font-semibold text-gray-900">Paramètres</h1>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Intégrations</h2>
          <div className="flex items-center justify-between py-2">
            <div>
              <span className="text-sm font-medium text-gray-900">Google Calendar</span>
              <span className="block text-xs text-gray-400">
                Importe les événements de votre agenda Google dans le calendrier.
              </span>
            </div>
            <GoogleSyncButton />
          </div>
        </div>
      </div>
    </div>
  );
}
