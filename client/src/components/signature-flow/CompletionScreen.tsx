// ============================================
// CompletionScreen Component
// ============================================
// Shown after the signer finishes the flow.
// Shows certification progress (TSA → Polygon → Bitcoin)
// UI state only - does NOT affect legal certification status
// ============================================

import { CheckCircle, Home, FileText } from 'lucide-react'

interface CompletionScreenProps {
  workflowTitle?: string | null
  onDownloadPdf: () => void
  onDownloadEco?: () => void
  onClose: () => void
}

export default function CompletionScreen({
  workflowTitle,
  onDownloadPdf,
  onDownloadEco,
  onClose
}: CompletionScreenProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-10 shadow-md">
        <div className="mb-6 flex justify-center">
          <CheckCircle className="h-16 w-16 text-emerald-500" />
        </div>
        <h1 className="mb-2 text-center text-3xl font-bold text-gray-900">
          ¡Firma completada!
        </h1>
        <p className="mb-4 text-center text-gray-600">
          El documento {workflowTitle ? <strong>{workflowTitle}</strong> : 'solicitado'} fue firmado correctamente.
        </p>

        <div className="space-y-3">
          <button
            onClick={onDownloadPdf}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            <FileText className="h-5 w-5" />
            Descargar PDF firmado
          </button>
          {onDownloadEco && (
            <button
              onClick={onDownloadEco}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
            >
              <FileText className="h-5 w-5" />
              Descargar .ECO
            </button>
          )}
          <button
            onClick={onClose}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
          >
            <Home className="h-5 w-5" />
            Volver al inicio
          </button>
        </div>

        <div className="mt-6 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-700">
          Guardá tu PDF firmado y tu archivo .ECO ahora. Son tu evidencia oficial.
          <span className="mt-2 block text-gray-800">
            Si no tenés una cuenta en EcoSign, descargalos ahora. Luego vas a necesitar pedírselos al creador del flujo.
          </span>
        </div>
      </div>
    </div>
  )
}
