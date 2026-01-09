import React from 'react';
import { Clock } from 'lucide-react';
import type { TimelineEvent } from '../lib/verifier/types';

type VerifierTimelineProps = {
  events: TimelineEvent[];
  loading?: boolean;
  error?: string | null;
  note?: string;
};

const formatUtcTooltip = (at: string) => {
  const utc = new Date(at).toISOString();
  return `UTC: ${utc}`;
};

export default function VerifierTimeline({ events, loading = false, error = null, note }: VerifierTimelineProps) {
  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center gap-2 text-gray-700">
          <Clock className="w-4 h-4" />
          <span className="text-sm font-semibold">Cronología verificada</span>
        </div>
        {note && <p className="text-xs text-gray-500 mt-2">{note}</p>}
        <p className="text-sm text-gray-600 mt-3">Cargando eventos…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center gap-2 text-gray-700">
          <Clock className="w-4 h-4" />
          <span className="text-sm font-semibold">Cronología verificada</span>
        </div>
        {note && <p className="text-xs text-gray-500 mt-2">{note}</p>}
        <p className="text-sm text-gray-600 mt-3">{error}</p>
      </div>
    );
  }

  if (!events.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center gap-2 text-gray-700">
          <Clock className="w-4 h-4" />
          <span className="text-sm font-semibold">Cronología verificada</span>
        </div>
        {note && <p className="text-xs text-gray-500 mt-2">{note}</p>}
        <p className="text-sm text-gray-600 mt-3">No hay eventos registrados para este documento.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center gap-2 text-gray-700 mb-2">
        <Clock className="w-4 h-4" />
        <span className="text-sm font-semibold">Cronología verificada</span>
      </div>
      {note && <p className="text-xs text-gray-500 mb-4">{note}</p>}
      <div className="border-l border-gray-200 pl-4 space-y-4">
        {events.map((event) => {
          const localTime = new Date(event.at).toLocaleString();
          return (
            <div key={event.id} className="relative">
              <div className="absolute -left-[23px] top-1.5 w-2 h-2 rounded-full bg-[#0E4B8B]" />
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <div>
                  <div className="text-sm font-medium text-gray-900">{event.label}</div>
                  {event.details && (
                    <div className="text-xs text-gray-600 mt-0.5">{event.details}</div>
                  )}
                </div>
                <div className="text-xs text-gray-600" title={formatUtcTooltip(event.at)}>
                  {localTime}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
