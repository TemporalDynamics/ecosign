/**
 * Certify Progress Component
 *
 * Purpose: Show progress/errors during certification (CTA)
 * Anti-explosions: A (Inesperado), B (Incomprensible), C (Tardío), D (Sin salida)
 *
 * P0.4: Errors in Spanish with context
 * P0.5: Progress visible with steps
 * P0.6: Timeout feedback
 * P0.7: Always tell if work is saved
 * P0.8: Retry button visible
 */

import React from 'react';
import { Loader2, X, CheckCircle2 } from 'lucide-react';
import type { CertifyStage } from '../lib/errorRecovery';

interface CertifyProgressProps {
  stage: CertifyStage;
  message: string;
  error?: string;
  canRetry?: boolean;
  workSaved?: boolean;
  onRetry?: () => void;
  onClose?: () => void;
}

export function CertifyProgress({
  stage,
  message,
  error,
  canRetry,
  workSaved,
  onRetry,
  onClose,
}: CertifyProgressProps) {
  // P0.4, P0.7, P0.8: Error state
  if (error) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <X className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-2">
                No se pudo completar la certificación
              </h3>
              {/* P0.4: Error en español con contexto */}
              <p className="text-sm text-gray-700 mb-3 whitespace-pre-line">
                {error}
              </p>
              {/* P0.7: Siempre decir si trabajo está guardado */}
              {workSaved !== undefined && (
                <div className="p-3 bg-gray-50 rounded-lg mb-3">
                  <p className="text-xs font-medium text-gray-900">
                    {workSaved
                      ? '✓ Tu documento y timestamp están guardados'
                      : 'ℹ️ El proceso no llegó a guardar datos'}
                  </p>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {/* P0.8: Retry siempre visible si aplica */}
            {canRetry && onRetry && (
              <button
                onClick={onRetry}
                className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                Reintentar
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className={`${
                  canRetry ? 'flex-1' : 'w-full'
                } px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors`}
              >
                Cerrar
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // P0.5, P0.6: Progress state
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex items-center gap-3 mb-4">
          <Loader2 className="w-6 h-6 text-gray-900 animate-spin flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">
              Certificando documento
            </h3>
            <p className="text-sm text-gray-600 mt-1">{message}</p>
          </div>
        </div>

        {/* P0.5: Pasos visibles */}
        <div className="space-y-2">
          <ProgressStep
            label="Preparando documento"
            status={getStepStatus(stage, 'preparing')}
          />
          <ProgressStep
            label="Timestamping legal"
            status={getStepStatus(stage, 'timestamping')}
          />
          <ProgressStep
            label="Anclaje blockchain"
            status={getStepStatus(stage, 'anchoring')}
          />
          <ProgressStep
            label="Generando certificado"
            status={getStepStatus(stage, 'generating')}
          />
        </div>

        {/* P0.6: Timeout feedback */}
        {message.includes('puede tardar') && (
          <p className="text-xs text-gray-500 mt-3 flex items-center gap-1">
            <span className="text-base">⏱️</span>
            Este paso puede tomar más tiempo de lo habitual
          </p>
        )}
      </div>
    </div>
  );
}

// Helper to determine step status
function getStepStatus(
  currentStage: CertifyStage,
  stepStage: 'preparing' | 'timestamping' | 'anchoring' | 'generating'
): 'pending' | 'current' | 'done' {
  const stageOrder: CertifyStage[] = [
    'idle',
    'preparing',
    'timestamping',
    'anchoring',
    'generating',
    'done',
  ];

  const currentIndex = stageOrder.indexOf(currentStage);
  const stepIndex = stageOrder.indexOf(stepStage);

  if (currentIndex > stepIndex) return 'done';
  if (currentIndex === stepIndex) return 'current';
  return 'pending';
}

// Progress step component
function ProgressStep({
  label,
  status,
}: {
  label: string;
  status: 'pending' | 'current' | 'done';
}) {
  return (
    <div className="flex items-center gap-2">
      {status === 'done' && (
        <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
      )}
      {status === 'current' && (
        <Loader2 className="w-4 h-4 text-gray-900 animate-spin flex-shrink-0" />
      )}
      {status === 'pending' && (
        <div className="w-4 h-4 rounded-full border-2 border-gray-300 flex-shrink-0" />
      )}
      <span
        className={`text-sm ${
          status === 'done'
            ? 'text-gray-400'
            : status === 'current'
              ? 'text-gray-900 font-medium'
              : 'text-gray-500'
        }`}
      >
        {label}
      </span>
    </div>
  );
}
